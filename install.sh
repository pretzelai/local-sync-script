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

# install bun if missing
if ! command -v bun &> /dev/null; then
  echo "installing bun..."
  curl -fsSL https://bun.sh/install | bash
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
  mv $DIR-main "$DIR"
  cd "$DIR"
fi

# install deps
echo "installing dependencies..."
bun install

# start postgres
echo "starting postgres..."
docker compose up -d

# wait for postgres to be ready
echo "waiting for postgres to be ready..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres &> /dev/null; then
    break
  fi
  sleep 1
done

echo ""
echo "ready. starting $DIR..."
echo ""

bun start
