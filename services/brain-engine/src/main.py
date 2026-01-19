"""
Brain Engine Service Entry Point

Run with: python -m src.main
Or: uvicorn src.main:app --reload
"""

import uvicorn
from src.app import app
from src.config.settings import get_settings


def main() -> None:
    """Run the brain engine service."""
    settings = get_settings()

    uvicorn.run(
        "src.app:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
