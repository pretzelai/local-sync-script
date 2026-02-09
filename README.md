local-sync-script

syncs your stripe data to a local postgres database and gives you a web ui to query it.

requires: mac, docker desktop (https://www.docker.com/products/docker-desktop/)

one-liner install (installs bun, clones repo, starts postgres, runs the tool):

  curl -fsSL https://raw.githubusercontent.com/pretzelai/local-sync-script/main/install.sh | bash

or do it manually:

  1. install bun if you don't have it: curl -fsSL https://bun.sh/install | bash
  2. clone the repo: git clone https://github.com/pretzelai/local-sync-script.git && cd local-sync-script
  3. install deps: bun install
  4. start postgres: docker compose up -d
  5. run it: bun start

on first run it asks for your stripe secret key (sk_test_... or sk_live_...) and saves it to .env.
it runs migrations and backfills your balance transactions from stripe into postgres.
then opens a web ui at http://localhost:3000 where you can run sql queries.

if the database already has data it skips the sync and goes straight to the web ui.

other commands:

  bun start --resync    re-run migrate + backfill without dropping data
  bun start --nuke      drop everything and start fresh

you can also nuke and resync from the web ui button.

to stop: ctrl+c in the terminal, then docker compose down to stop postgres.

queries live in src/queries.ts, add your own there and they show up in the sidebar.
