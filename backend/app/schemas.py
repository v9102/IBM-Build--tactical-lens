from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    match_id: str


# Moment / match payloads are passed through as plain dicts (curated JSON) —
# no schema needed, the frontend owns their shape. ponytail: don't model data
# that only flows one way through.
