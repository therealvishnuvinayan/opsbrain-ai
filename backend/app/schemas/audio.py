from pydantic import BaseModel


class AudioTranscriptionResponse(BaseModel):
    text: str
    translated_to_english: bool = True
    model: str
