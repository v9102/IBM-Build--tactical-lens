from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    watsonx_apikey: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"
    watsonx_project_id: str = ""
    granite_model_id: str = "ibm/granite-3-8b-instruct"
    embed_model_id: str = "ibm/slate-125m-english-rtrvr-v2"

    mock: bool = False  # swap in fake LLM/embeddings; no watsonx creds needed
    rag: bool = True    # ingest Docling reports at startup

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
