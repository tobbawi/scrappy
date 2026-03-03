import json
import os
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
    # Always sync Ollama URL from env var (Docker sets this to host.docker.internal)
    ollama_host = os.environ.get("OLLAMA_HOST")
    if ollama_host and settings.ollama_base_url != ollama_host:
        settings.ollama_base_url = ollama_host
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


def _settings_to_read(s: AppSettings) -> SettingsRead:
    return SettingsRead(
        llm_provider=s.llm_provider,
        ollama_base_url=s.ollama_base_url,
        ollama_model=s.ollama_model,
        ollama_timeout=s.ollama_timeout,
        openai_base_url=s.openai_base_url,
        openai_model=s.openai_model,
        openai_timeout=s.openai_timeout,
        scraper_enabled_fields=json.loads(s.scraper_enabled_fields or "[]"),
        scraper_heuristic_labels=json.loads(s.scraper_heuristic_labels or "{}"),
    )


@router.get("", response_model=SettingsRead)
def get_settings(session: Session = Depends(get_session)):
    return _settings_to_read(get_or_create_settings(session))


@router.patch("", response_model=SettingsRead)
def update_settings(data: SettingsUpdate, session: Session = Depends(get_session)):
    settings = get_or_create_settings(session)
    ollama_host_env = os.environ.get("OLLAMA_HOST")
    for key, value in data.model_dump(exclude_unset=True).items():
        # Skip ollama_base_url when env var controls it
        if key == "ollama_base_url" and ollama_host_env:
            continue
        if key == "scraper_enabled_fields":
            settings.scraper_enabled_fields = json.dumps(value)
        elif key == "scraper_heuristic_labels":
            settings.scraper_heuristic_labels = json.dumps(value)
        else:
            setattr(settings, key, value)
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return _settings_to_read(settings)


def _fetch_ollama_models(base_url: str) -> dict:
    try:
        r = httpx.get(f"{base_url}/api/tags", timeout=5)
        r.raise_for_status()
        models = [m["name"] for m in r.json().get("models", [])]
        return {"models": models, "reachable": True, "error": None}
    except Exception as e:
        return {"models": [], "reachable": False, "error": str(e)}


def _fetch_openai_models(base_url: str) -> dict:
    try:
        r = httpx.get(f"{base_url.rstrip('/')}/v1/models", timeout=5)
        r.raise_for_status()
        body = r.json()
        models = [m["id"] for m in body.get("data", [])]
        return {"models": models, "reachable": True, "error": None}
    except Exception as e:
        return {"models": [], "reachable": False, "error": str(e)}


def _test_ollama(settings: AppSettings) -> dict:
    result: dict = {"reachable": False, "model_available": False}
    try:
        r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=5)
        r.raise_for_status()
        result["reachable"] = True
        models = [m["name"] for m in r.json().get("models", [])]
        result["available_models"] = models
        configured_base = settings.ollama_model.split(":")[0]
        result["model_available"] = any(
            m.split(":")[0] == configured_base for m in models
        )
    except Exception as e:
        result["error"] = str(e)
    return result


def _test_openai(settings: AppSettings) -> dict:
    result: dict = {"reachable": False, "model_available": False}
    try:
        base = settings.openai_base_url.rstrip("/")
        r = httpx.get(f"{base}/v1/models", timeout=5)
        r.raise_for_status()
        result["reachable"] = True
        models = [m["id"] for m in r.json().get("data", [])]
        result["available_models"] = models
        result["model_available"] = settings.openai_model in models if settings.openai_model else len(models) > 0
    except Exception as e:
        result["error"] = str(e)
    return result


@router.get("/llm/models")
def list_llm_models(provider: str = "ollama", session: Session = Depends(get_session)):
    """Fetch available models from the configured LLM provider."""
    settings = get_or_create_settings(session)
    if provider == "openai":
        return _fetch_openai_models(settings.openai_base_url)
    return _fetch_ollama_models(settings.ollama_base_url)


@router.post("/llm/test")
def test_llm(provider: str = "ollama", session: Session = Depends(get_session)):
    """Quick connectivity + model availability check for any provider."""
    settings = get_or_create_settings(session)
    if provider == "openai":
        return _test_openai(settings)
    return _test_ollama(settings)


@router.get("/ollama/models")
def list_ollama_models(session: Session = Depends(get_session)):
    """Fetch available models from the configured Ollama instance."""
    settings = get_or_create_settings(session)
    return _fetch_ollama_models(settings.ollama_base_url)


@router.post("/ollama/test")
def test_ollama_endpoint(session: Session = Depends(get_session)):
    """Quick connectivity + model availability check."""
    settings = get_or_create_settings(session)
    return _test_ollama(settings)
