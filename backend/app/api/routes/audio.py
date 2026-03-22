import io

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from openai import AsyncOpenAI

from app.core.config import get_settings
from app.schemas.audio import AudioTranscriptionResponse

router = APIRouter(prefix="/audio", tags=["audio"])


@router.post("/transcribe", response_model=AudioTranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(...)) -> AudioTranscriptionResponse:
    settings = get_settings()

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Audio transcription is not configured.",
        )

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A file is required.")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    buffer = io.BytesIO(audio_bytes)
    buffer.name = file.filename

    try:
        translation = await client.audio.translations.create(
            model="whisper-1",
            file=buffer,
        )
    except Exception as exc:  # pragma: no cover - upstream API/network failure
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Audio transcription failed.",
        ) from exc

    text = (translation.text or "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No speech was detected in the uploaded audio.",
        )

    return AudioTranscriptionResponse(
        text=text,
        translated_to_english=True,
        model="whisper-1",
    )
