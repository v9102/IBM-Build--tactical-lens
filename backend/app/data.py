import json
from pathlib import Path

MOMENTS_DIR = Path(__file__).resolve().parent.parent / "data" / "moments"


def load_moments() -> dict[str, dict]:
    """All curated moments, keyed by id (== filename stem)."""
    return {
        p.stem: json.loads(p.read_text(encoding="utf-8"))
        for p in sorted(MOMENTS_DIR.glob("*.json"))
    }


def match_summary(m: dict) -> dict:
    """The light fields the selector page needs."""
    return {
        "id": m["id"],
        "title": m["title"],
        "year": m["year"],
        "teams": m["teams"],
        "minute": m.get("minute"),
        "moment_label": m.get("moment_label", m["title"]),
    }
