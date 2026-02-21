import logging
from collections.abc import Sequence

from openai import AsyncOpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = (
            AsyncOpenAI(
                api_key=self.settings.openai_api_key,
                # Avoid long retry loops when quota/auth issues happen.
                max_retries=0,
                timeout=15.0,
            )
            if self.settings.openai_api_key
            else None
        )

    @property
    def enabled(self) -> bool:
        return self._client is not None

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float] | None]:
        if not texts:
            return []

        if not self._client:
            return [None for _ in texts]

        try:
            response = await self._client.embeddings.create(
                model=self.settings.openai_embedding_model,
                input=list(texts),
            )
        except Exception as exc:
            logger.warning(
                "Embedding request failed; falling back to no-vector mode. reason=%s",
                exc,
            )
            return [None for _ in texts]

        embeddings: list[list[float] | None] = []

        for item in response.data:
            vector = list(item.embedding)

            if len(vector) != self.settings.embedding_dimensions:
                embeddings.append(None)
                continue

            embeddings.append(vector)

        if len(embeddings) < len(texts):
            embeddings.extend([None] * (len(texts) - len(embeddings)))

        return embeddings
