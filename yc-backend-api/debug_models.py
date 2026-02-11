
import os
import google.generativeai as genai
from decouple import config

# Try to get key from env, similar to services.py
api_key = config("GEMINI_API_KEY", default=os.environ.get("GEMINI_API_KEY"))

if not api_key:
    print("Error: GEMINI_API_KEY not found in environment.")
else:
    genai.configure(api_key=api_key)
    try:
        print("Listing available models...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"Name: {m.name}")
    except Exception as e:
        print(f"Error listing models: {e}")
