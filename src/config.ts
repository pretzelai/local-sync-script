import { existsSync, readFileSync, writeFileSync, openSync, closeSync } from "fs";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import { join } from "path";
import * as tty from "tty";

const CONFIG_PATH = join(process.cwd(), ".env");

export interface Config {
  stripeKey: string;
  databaseUrl: string;
}

function getTTYInput(): { input: NodeJS.ReadableStream; cleanup: () => void } {
  if (stdin.isTTY) return { input: stdin, cleanup: () => {} };
  // stdin is piped (e.g. curl | bash) — open the terminal directly
  const fd = openSync("/dev/tty", "r");
  const stream = new tty.ReadStream(fd);
  return { input: stream, cleanup: () => { stream.destroy(); closeSync(fd); } };
}

async function ask(question: string): Promise<string> {
  const { input, cleanup } = getTTYInput();
  const rl = createInterface({ input, output: stdout });
  const answer = await rl.question(question);
  rl.close();
  cleanup();
  return answer.trim();
}

export function loadConfig(): Config | null {
  // Check environment variables first
  if (process.env.STRIPE_SECRET_KEY && process.env.DATABASE_URL) {
    return {
      stripeKey: process.env.STRIPE_SECRET_KEY,
      databaseUrl: process.env.DATABASE_URL,
    };
  }

  // Check .env file
  if (!existsSync(CONFIG_PATH)) return null;

  const content = readFileSync(CONFIG_PATH, "utf-8");
  const vars: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=][^=]*)=(.*)$/);
    if (match) {
      vars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  if (vars.STRIPE_SECRET_KEY && vars.DATABASE_URL) {
    return {
      stripeKey: vars.STRIPE_SECRET_KEY,
      databaseUrl: vars.DATABASE_URL,
    };
  }

  return null;
}

export function saveConfig(config: Config): void {
  const content = [
    `STRIPE_SECRET_KEY=${config.stripeKey}`,
    `DATABASE_URL=${config.databaseUrl}`,
    "",
  ].join("\n");
  writeFileSync(CONFIG_PATH, content, "utf-8");
}

export async function promptForConfig(): Promise<Config> {
  console.log("\n--- Stripe Sync Setup ---\n");

  const stripeKey = await ask("Enter your Stripe secret key (sk_...): ");
  if (!stripeKey.startsWith("sk_")) {
    console.error("Error: Stripe key must start with 'sk_'");
    process.exit(1);
  }

  console.log(
    "\nThe sync engine requires PostgreSQL. A docker-compose.yml is included."
  );
  console.log("Run: docker compose up -d");
  console.log(
    "Default URL: postgresql://postgres:postgres@localhost:5432/stripe_sync\n"
  );

  const databaseUrl =
    (await ask(
      "Enter PostgreSQL database URL (press Enter for default): "
    )) || "postgresql://postgres:postgres@localhost:5432/stripe_sync";

  const config: Config = { stripeKey, databaseUrl };
  saveConfig(config);

  console.log("\nConfig saved to .env\n");
  return config;
}
