import os
import uuid
import base64
from typing import Tuple, Optional
from app.core.config import settings

class StorageService:
    def __init__(self, base_path: Optional[str] = None):
        self.base_path = base_path or settings.STORAGE_PATH
        self.vehicles_dir = os.path.join(self.base_path, "vehicles")
        self.plates_dir = os.path.join(self.base_path, "plates")
        self.evidence_dir = os.path.join(self.base_path, "evidence")
        
        # Ensure directories exist
        for d in [self.vehicles_dir, self.plates_dir, self.evidence_dir]:
            os.makedirs(d, exist_ok=True)

    def save_base64_image(self, category: str, base64_str: str) -> str:
        """
        Saves a base64 encoded image to the specified storage category (vehicles, plates, evidence)
        Returns the relative file path.
        """
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
            
        file_id = f"{uuid.uuid4().hex}.jpg"
        target_dir = os.path.join(self.base_path, category)
        os.makedirs(target_dir, exist_ok=True)
        
        file_path = os.path.join(target_dir, file_id)
        with open(file_path, "wb") as fh:
            fh.write(base64.b64decode(base64_str))
            
        return f"/storage/{category}/{file_id}"

    def get_file_path(self, relative_path: str) -> Optional[str]:
        if not relative_path:
            return None
        clean_path = relative_path.lstrip("/").replace("storage/", "")
        full_path = os.path.join(self.base_path, clean_path)
        if os.path.exists(full_path):
            return full_path
        return None

storage_service = StorageService()
