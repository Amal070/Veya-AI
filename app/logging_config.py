import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt='{"time":"%(asctime)s","level":"%(levelname)s",'
                '"logger":"%(name)s","message":"%(message)s"}'
        )
    )
    root = logging.getLogger()
    root.setLevel(level)
    # Avoid duplicate handlers if configure_logging() is called more than
    # once (e.g. under a test runner that imports app.main repeatedly).
    root.handlers.clear()
    root.addHandler(handler)

    # Quiet down noisy third-party loggers that would otherwise flood
    # structured logs with non-JSON lines.
    for noisy in ("httpx", "httpcore", "websockets", "chromadb.telemetry"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
