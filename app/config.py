from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="VEYA_",
        extra="ignore",
    )

    # LLM
    groq_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("VEYA_GROQ_API_KEY", "GROQ_API_KEY"),
    )
    llm_model: str = Field(
        default="qwen/qwen3.8-27b",
        validation_alias=AliasChoices("VEYA_LLM_MODEL", "LLM_MODEL"),
    )
    llm_timeout_seconds: float = 20.0
    llm_max_retries: int = 2

    # Whisper (STT)
    whisper_model_size: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_min_confidence_logprob: float = -1.0

    # TTS
    tts_voice: str = "en-IN-NeerjaNeural"
    tts_rate: str = "+18%"  # slightly faster, natural-sounding
    audio_dir: str = "audio"
    audio_cleanup_age_seconds: int = 3600
    audio_cleanup_interval_seconds: int = 600

    # Uploads
    upload_dir: str = "uploads"
    max_upload_bytes: int = 5 * 1024 * 1024
    max_audio_upload_bytes: int = 10 * 1024 * 1024

    # RAG
    rag_chunk_size: int = 500
    rag_chunk_overlap: int = 100
    rag_n_results: int = 3
    chroma_db_path: str = "veya_chroma_db"

    # Interview
    default_question_count: int = 5
    min_question_count: int = 1
    max_question_count: int = 15

    # CORS
    cors_origins: list[str] = [
    "http://localhost:5173",
    "https://veya.web.app",
    "https://veya.firebaseapp.com",
]

    # Persistence
    checkpoint_db_path: str = "veya_checkpoints.sqlite"

    # Session
    session_idle_timeout_seconds: int = 1800  # 30 min


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
