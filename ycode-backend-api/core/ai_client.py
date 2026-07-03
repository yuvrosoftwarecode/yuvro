import httpx
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class AIClient:
    """Client for communicating with YHub AI endpoints."""
    
    @classmethod
    async def generate_response(cls, messages, temperature=0.7, max_tokens=1500, auth_token=None):
        """
        Calls the YHub quick_chat endpoint to generate a response.
        """
        base_url = getattr(settings, 'YHUB_INTERNAL_API_URL', 'http://localhost:8001')
        url = f"{base_url}/api/quick_chat/"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            
        data = {
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        compressed_message = ""
        for msg in messages:
            compressed_message += f"{msg['role'].upper()}: {msg['content']}\n"
            
        data["message"] = compressed_message.strip()
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=data, headers=headers, timeout=60.0)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Failed to generate response from YHub AI: {str(e)}")
                raise Exception(f"AI Service Error: {str(e)}")

    @classmethod
    async def create_interview_session(cls, data, auth_token=None):
        base_url = getattr(settings, 'YHUB_INTERNAL_API_URL', 'http://localhost:8001')
        url = f"{base_url}/api/interviews/"
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            
        async with httpx.AsyncClient() as client:
            try:
                files = data.pop('resume', None)
                if files:
                    if hasattr(files, 'read'):
                        file_tuple = (files.name, files.read(), files.content_type)
                        response = await client.post(url, data=data, files={'resume': file_tuple}, headers=headers, timeout=60.0)
                    else:
                        response = await client.post(url, data=data, files={'resume': files}, headers=headers, timeout=60.0)
                else:
                    response = await client.post(url, json=data, headers=headers, timeout=60.0)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Failed to create interview session: {str(e)}")
                raise Exception(f"AI Service Error: {str(e)}")

    @classmethod
    async def get_interview_session(cls, session_id, auth_token=None):
        base_url = getattr(settings, 'YHUB_INTERNAL_API_URL', 'http://localhost:8001')
        url = f"{base_url}/api/interviews/{session_id}/"
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, timeout=30.0)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Failed to get interview session: {str(e)}")
                raise Exception(f"AI Service Error: {str(e)}")

    @classmethod
    async def generate_interview_report(cls, session_id, auth_token=None):
        base_url = getattr(settings, 'YHUB_INTERNAL_API_URL', 'http://localhost:8001')
        url = f"{base_url}/api/interviews/{session_id}/generate_report/"
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, timeout=120.0)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Failed to generate interview report: {str(e)}")
                raise Exception(f"AI Service Error: {str(e)}")

    @classmethod
    async def add_interview_message(cls, session_id, role, content, auth_token=None):
        base_url = getattr(settings, 'YHUB_INTERNAL_API_URL', 'http://localhost:8001')
        url = f"{base_url}/api/interviews/{session_id}/add_message/"
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            
        data = {"role": role, "content": content}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=data, headers=headers, timeout=30.0)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Failed to add interview message: {str(e)}")
                raise Exception(f"AI Service Error: {str(e)}")

    @classmethod
    async def get_interview_state(cls, session_id, auth_token=None):
        base_url = getattr(settings, 'YHUB_INTERNAL_API_URL', 'http://localhost:8001')
        url = f"{base_url}/api/interviews/{session_id}/state/"
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, timeout=30.0)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Failed to get interview state: {str(e)}")
                raise Exception(f"AI Service Error: {str(e)}")

    @classmethod
    async def update_interview_state(cls, session_id, state_data, auth_token=None):
        base_url = getattr(settings, 'YHUB_INTERNAL_API_URL', 'http://localhost:8001')
        url = f"{base_url}/api/interviews/{session_id}/state/"
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            
        data = {"state_data": state_data}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=data, headers=headers, timeout=30.0)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Failed to update interview state: {str(e)}")
                raise Exception(f"AI Service Error: {str(e)}")
