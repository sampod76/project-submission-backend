#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  echo -e "\n\033[1;32m**$1**\033[0m"
}

APP_DIR="$HOME/apps/sampod/project-submission-backend"
COMPOSE_FILE="docker-compose.pro.yml"

cd "$APP_DIR"

log "Pulling backend and migration image"
# https://app.notion.com/p/sampod/Migration-Docker-Container-4067a1bce8f580828fd1d5cbd3434ba4?source=copy_link
docker compose -f "$COMPOSE_FILE" pull app migrate

log "Running migrations before starting the backend"
if ! docker compose -f "$COMPOSE_FILE" up -d --no-build --force-recreate --wait --wait-timeout 120 app; then
  echo "Deployment failed: check migrate logs and app health with docker compose -f $COMPOSE_FILE logs migrate app." >&2
  exit 1
fi

log "Cleaning unused Docker images"
docker image prune -f

log "Cleaning Docker build cache"
docker builder prune -f


log "Backend deployed successfully"

exit 0

# sudo chmod +x deploy.sh