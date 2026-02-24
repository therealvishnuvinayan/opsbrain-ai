import httpx

from app.core.config import get_settings


class ZendeskClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def enabled(self) -> bool:
        return bool(
            self.settings.zendesk_subdomain
            and self.settings.zendesk_email
            and self.settings.zendesk_api_token
        )

    async def post_internal_note(self, ticket_id: str, note: str) -> dict:
        if not self.enabled:
            raise RuntimeError("Zendesk credentials are not configured")

        base_url = f"https://{self.settings.zendesk_subdomain}.zendesk.com"
        username = f"{self.settings.zendesk_email}/token"

        payload = {
            "ticket": {
                "comment": {
                    "public": False,
                    "body": note,
                }
            }
        }

        timeout = httpx.Timeout(
            timeout=self.settings.external_request_timeout_sec,
            connect=min(5.0, self.settings.external_request_timeout_sec),
        )

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.put(
                f"{base_url}/api/v2/tickets/{ticket_id}.json",
                json=payload,
                auth=(username, self.settings.zendesk_api_token),
            )
            response.raise_for_status()
            return response.json()
