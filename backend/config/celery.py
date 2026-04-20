"""Celery application configuration for SeaConnect."""
import os

from celery import Celery

# Default to dev settings; override with DJANGO_SETTINGS_MODULE env var.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("seaconnect")

# Load configuration from Django settings using the CELERY_ namespace prefix.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed Django apps.
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self) -> None:  # type: ignore[override]
    """Debug task that prints the request for troubleshooting."""
    print(f"Request: {self.request!r}")
