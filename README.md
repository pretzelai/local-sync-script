# local-sync-script

Syncs your Stripe data to a local Postgres database and gives you a web UI to query it.

**Requires:** Mac, [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## One-liner install

Installs Bun, clones repo, starts Postgres, runs the tool:

```bash
curl -fsSL https://raw.githubusercontent.com/pretzelai/local-sync-script/main/install.sh | bash
```

## Manual setup

1. Install Bun if you don't have it:

```bash
curl -fsSL https://bun.sh/install | bash
```

2. Clone the repo:

```bash
git clone https://github.com/pretzelai/local-sync-script.git && cd local-sync-script
```

3. Install deps:

```bash
bun install
```

4. Start Postgres:

```bash
docker compose up -d
```

5. Run it:

```bash
bun start
```

## How it works

On first run it asks for your Stripe secret key (`sk_...` or `rk_...`) and saves it to `.env`.
It runs migrations and backfills your balance transactions from Stripe into Postgres,
then opens a web UI at [http://localhost:3000](http://localhost:3000) where you can run SQL queries.

If the database already has data it skips the sync and goes straight to the web UI.

## Other commands

```bash
bun start --resync    # re-run migrate + backfill without dropping data
bun start --nuke      # drop everything and start fresh
```

You can also nuke and resync from the web UI button.

To stop: `Ctrl+C` in the terminal, then:

```bash
docker compose down
```

## Custom queries

Queries live in `src/queries.ts` — add your own there and they show up in the sidebar.
