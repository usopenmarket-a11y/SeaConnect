#!/bin/sh
set -e

# Generate JWT RS256 keys if missing
if [ ! -f /app/keys/jwt_private.pem ]; then
  echo "[entrypoint] Generating JWT RS256 key pair..."
  openssl genrsa -out /app/keys/jwt_private.pem 2048
  openssl rsa -in /app/keys/jwt_private.pem -pubout -out /app/keys/jwt_public.pem
  chmod 600 /app/keys/jwt_private.pem
  echo "[entrypoint] JWT keys generated."
fi

# Wait for Postgres to be ready (belt-and-suspenders on top of healthcheck)
echo "[entrypoint] Waiting for database..."
until python -c "
import os, sys
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()
from django.db import connection
connection.ensure_connection()
" 2>/dev/null; do
  echo "[entrypoint] DB not ready, retrying in 2s..."
  sleep 2
done
echo "[entrypoint] Database ready."

# Run migrations
echo "[entrypoint] Running migrations..."
python manage.py migrate --noinput

# Create superuser if DJANGO_SUPERUSER_EMAIL is set
if [ -n "$DJANGO_SUPERUSER_EMAIL" ]; then
  python manage.py shell -c "
from apps.accounts.models import User
if not User.objects.filter(email='$DJANGO_SUPERUSER_EMAIL').exists():
    User.objects.create_superuser('$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')
    print('[entrypoint] Superuser created.')
else:
    print('[entrypoint] Superuser already exists.')
"
fi

echo "[entrypoint] Starting server..."
exec "$@"
