import logging

from chromadb import PersistentClient

from app.config import settings

logger = logging.getLogger(__name__)

client = PersistentClient(path=settings.chroma_db_path)
collection = client.get_or_create_collection(name="veya_resumes")
