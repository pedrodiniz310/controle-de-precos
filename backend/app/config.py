from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://user:pass@localhost/pricewatch"

    # Telegram
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Email (Resend)
    resend_api_key: str = ""
    alert_email_to: str = ""
    alert_email_from: str = "pricewatch@noreply.com"

    # Obsidian Local REST API
    obsidian_api_key: str = ""
    obsidian_base_url: str = "https://localhost:27124"

    # CORS
    frontend_origin: str = "http://localhost:5500"

    # Scheduler
    scrape_interval_hours: int = 6

    # App
    port: int = 8080


settings = Settings()
