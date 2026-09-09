from urllib.parse import urlparse, parse_qs, urlunparse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings


def _prepare_db_url(url: str) -> tuple[str, dict]:
    """Convert a standard postgres:// URL to asyncpg dialect and strip incompatible params."""
    # Rewrite scheme for asyncpg
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    elif url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]

    # Parse URL and extract sslmode before stripping all query params
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    sslmode = params.get("sslmode", [None])[0]

    # Strip ALL query params — asyncpg doesn't accept any of them
    clean_url = urlunparse(parsed._replace(query=""))

    # asyncpg uses connect_args for SSL, not query params
    connect_args = {}
    if sslmode == "require":
        connect_args["ssl"] = "require"

    return clean_url, connect_args


_db_url, _connect_args = _prepare_db_url(settings.DATABASE_URL)

# Create async engine
engine = create_async_engine(
    _db_url,
    pool_pre_ping=True,
    **({"connect_args": _connect_args} if _connect_args else {}),
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


async def get_db():
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
