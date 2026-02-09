#!/bin/bash

REPO_USER="pretzelai"
DIR="local-sync-script"

set -e

echo "$DIR installer"
echo ""

# check for docker
if ! command -v docker &> /dev/null; then
  echo "docker not found. install docker desktop first:"
  echo "  https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info &> /dev/null 2>&1; then
  echo "docker is installed but not running. start docker desktop first."
  exit 1
fi

# detect docker compose command (v2 plugin vs standalone v1)
if docker compose version &> /dev/null; then
  DC="docker compose"
elif command -v docker-compose &> /dev/null; then
  DC="docker-compose"
else
  echo "docker compose not found. install docker desktop or docker-compose."
  exit 1
fi

# install bun if missing
if ! command -v bun &> /dev/null; then
  echo "installing bun..."
  curl -fsSL https://bun.sh/install | bash < /dev/null
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo ""
fi

if [ -d "$DIR" ]; then
  echo "directory $DIR already exists, using it"
  cd "$DIR"
else
  echo "downloading repo..."
  curl -fsSL "https://github.com/$REPO_USER/${DIR}/archive/refs/heads/main.tar.gz" | tar xz
  mv "${DIR}-main" "$DIR"
  cd "$DIR"
fi

# install deps
echo "installing dependencies..."
bun install < /dev/null

# start postgres
echo "starting postgres..."
$DC up -d < /dev/null

# wait for postgres to be ready
echo "waiting for postgres to be ready..."
PG_READY=0
for i in $(seq 1 30); do
  if $DC exec -T postgres pg_isready -U postgres < /dev/null &> /dev/null; then
    PG_READY=1
    break
  fi
  sleep 1
done

if [ "$PG_READY" -eq 0 ]; then
  echo ""
  echo "error: postgres did not become ready within 30 seconds."
  echo "check docker logs:  $DC logs postgres"
  exit 1
fi

echo ""
echo "ready. starting $DIR..."
echo ""

exec bun run src/index.ts
