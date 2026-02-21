from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def load_all_models() -> None:
    # Import models for metadata registration.
    from app.models import customer  # noqa: F401
    from app.models import event  # noqa: F401
    from app.models import knowledge_chunk  # noqa: F401
    from app.models import knowledge_source  # noqa: F401
    from app.models import order  # noqa: F401
    from app.models import run  # noqa: F401
    from app.models import supplier  # noqa: F401
