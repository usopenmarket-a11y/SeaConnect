"""Celery application configuration for SeaConnect."""
import os

from celery import Celery
from celery.schedules import crontab

# Default to dev settings; override with DJANGO_SETTINGS_MODULE env var.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("seaconnect")

# Load configuration from Django settings using the CELERY_ namespace prefix.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed Django apps.
app.autodiscover_tasks()

# ---------------------------------------------------------------------------
# Beat schedule — Sprint 3
# ---------------------------------------------------------------------------
# auto_expire_pending_bookings runs every 15 minutes. Combined with the
# BOOKING_OWNER_RESPONSE_HOURS setting (default 2 hours), unanswered booking
# requests are auto-declined within ~2h15m of creation.
app.conf.beat_schedule = {
    "auto-expire-pending-bookings": {
        "task": "apps.bookings.tasks.auto_expire_pending_bookings",
        "schedule": crontab(minute="*/15"),
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self) -> None:  # type: ignore[override]
    """Debug task that prints the request for troubleshooting."""
    print(f"Request: {self.request!r}")
