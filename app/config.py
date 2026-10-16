from functools import lru_cache
from typing import Any

from pydantic import AliasChoices, Field, field_validator
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
    cors_origins: list[str] = Field(
        default=[
            "https://veya-ai-frontend.onrender.com",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
            "https://veya.web.app",
            "https://veya.firebaseapp.com",
        ],
        validation_alias=AliasChoices("VEYA_CORS_ORIGINS", "CORS_ORIGINS"),
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json

                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip().rstrip("/") for item in parsed if item]
                except Exception:
                    pass
            # Comma-separated or newline-separated fallback
            return [
                part.strip().rstrip("/")
                for part in v.replace("\n", ",").split(",")
                if part.strip()
            ]
        if isinstance(v, (list, tuple, set)):
            return [str(item).strip().rstrip("/") for item in v if item]
        return v

    # Persistence
    checkpoint_db_path: str = "veya_checkpoints.sqlite"

    # Session
    session_idle_timeout_seconds: int = 1800  # 30 min


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
