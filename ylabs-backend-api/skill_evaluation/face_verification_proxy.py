import threading
import requests
import json
from django.core.files.storage import default_storage
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def run_async_face_verification(submission_model_class, submission_id):
    def _verify_thread():
        try:
            submission = submission_model_class.objects.get(id=submission_id)
            
            # Find reference photo
            reference_image_path = None
            if hasattr(submission, 'general_events') and isinstance(submission.general_events, list):
                for event in submission.general_events:
                    if event.get("activity_type") == "passport_photo_captured":
                        reference_image_path = event.get("image_path")
                        break
            
            if not reference_image_path:
                logger.warning(f"No passport_photo_captured found for submission {submission_id}")
            
            # Gather all snapshot paths
            snapshot_paths = []
            
            if hasattr(submission, 'general_events') and isinstance(submission.general_events, list):
                for event in submission.general_events:
                    if event.get("activity_type") == "snapshot" and event.get("image_path"):
                        snapshot_paths.append(event.get("image_path"))
            
            if hasattr(submission, 'proctoring_events') and isinstance(submission.proctoring_events, list):
                for event in submission.proctoring_events:
                    if event.get("activity_type") == "snapshot" and event.get("image_path"):
                        snapshot_paths.append(event.get("image_path"))
                                
            # Remove duplicates
            snapshot_paths = list(set(snapshot_paths))
            
            if not snapshot_paths:
                logger.warning(f"No snapshots found for submission {submission_id}")
                return
                
            # Download files
            ref_bytes = None
            if reference_image_path:
                try:
                    ref_bytes = default_storage.open(reference_image_path).read()
                except Exception as e:
                    logger.error(f"Error reading reference image: {e}")
                    return
                
            files = []
            if reference_image_path:
                files.append(("reference_image", ("ref.jpg", ref_bytes, "image/jpeg")))
            
            for i, spath in enumerate(snapshot_paths):
                try:
                    p_bytes = default_storage.open(spath).read()
                    files.append(("probe_images", (f"probe_{i}.jpg", p_bytes, "image/jpeg")))
                except Exception as e:
                    logger.error(f"Error reading snapshot image {spath}: {e}")
                    
            if len(files) == 1: # Only reference
                return
                
            fastapi_url = getattr(settings, "CODE_EXECUTOR_API_URL", "http://yuvro-code-executor:8009")
            if fastapi_url.endswith("/"):
                fastapi_url = fastapi_url[:-1]
            verify_url = f"{fastapi_url}/api/v1/proctoring/verify-batch"
            
            response = requests.post(verify_url, files=files, timeout=120)
            
            if response.status_code == 200:
                data = response.json()
                
                raw_results = data.get("raw_results", [])
                update_fields = []
                
                if raw_results and len(raw_results) == len(snapshot_paths):
                    def update_event_list(events_list):
                        updated = False
                        if not isinstance(events_list, list): return updated
                        for event in events_list:
                            if event.get("activity_type") == "snapshot" and event.get("image_path"):
                                try:
                                    idx = snapshot_paths.index(event.get("image_path"))
                                    res = raw_results[idx]
                                    flags = res.get("risk_flags", [])
                                    if "multiple_faces_detected" in flags:
                                        event["activity_type"] = "multiple_faces_detected"
                                        updated = True
                                    elif "face_mismatch" in flags:
                                        event["activity_type"] = "face_mismatch"
                                        updated = True
                                    elif "no_face_detected" in flags:
                                        event["activity_type"] = "face_not_detected"
                                        updated = True
                                except ValueError:
                                    pass
                        return updated

                    if update_event_list(submission.general_events):
                        update_fields.append("general_events")
                    if update_event_list(submission.proctoring_events):
                        update_fields.append("proctoring_events")
                        
                if update_fields:
                    submission.save(update_fields=update_fields)
            else:
                logger.error(f"Face verification API failed: {response.text}")
                
        except Exception as e:
            logger.error(f"Error in async face verification: {e}")

    thread = threading.Thread(target=_verify_thread)
    thread.daemon = True
    thread.start()
