from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    match_id: str


class RegenerateRequest(BaseModel):
    match_id: str
    agent_key: str


class CompareRequest(BaseModel):
    match_id_1: str
    match_id_2: str
