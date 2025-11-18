"""Application settings."""

from functools import lru_cache
from typing import Optional

from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    """Centralised application configuration."""

    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    deepseek_api_key: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("DEEPSEEK_API_KEY", "deepseek_api_key"),
    )
    deepseek_base_url: str = Field(default="https://api.deepseek.com/v1")
    deepseek_model: str = Field(default="deepseek-chat")


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
