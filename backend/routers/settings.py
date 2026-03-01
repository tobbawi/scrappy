from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import httpx

from database import get_session
from models import AppSettings
from schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


def get_or_create_settings(session: Session) -> AppSettings:
    settings = session.get(AppSettings, 1)
    if not settings:
        settings = AppSettings()
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


@router.get("", response_model=SettingsRead)
def get_settings(session: Session = Depends(get_session)):
    return get_or_create_settings(session)


@router.patch("", response_model=SettingsRead)
def update_settings(data: SettingsUpdate, session: Session = Depends(get_session)):
    settings = get_or_create_settings(session)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings


@router.get("/ollama/models")
def list_ollama_models(session: Session = Depends(get_session)):
    """Fetch available models from the configured Ollama instance."""
    settings = get_or_create_settings(session)
    try:
        r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=5)
        r.raise_for_status()
        models = [m["name"] for m in r.json().get("models", [])]
        return {"models": models, "reachable": True}
    except Exception as e:
        return {"models": [], "reachable": False, "error": str(e)}


@router.post("/ollama/test")
def test_ollama(session: Session = Depends(get_session)):
    """Quick connectivity + model availability check."""
    settings = get_or_create_settings(session)
    result: dict = {"reachable": False, "model_available": False}
    try:
        r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=5)
        r.raise_for_status()
        result["reachable"] = True
        models = [m["name"] for m in r.json().get("models", [])]
        result["available_models"] = models
        # Check if configured model is available (check base name without tag)
        configured_base = settings.ollama_model.split(":")[0]
        result["model_available"] = any(
            m.split(":")[0] == configured_base for m in models
        )
    except Exception as e:
        result["error"] = str(e)
    return result
