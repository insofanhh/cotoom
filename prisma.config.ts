import { defineConfig } from "prisma/config";
import { config } from "dotenv";
import path from "path";

// An explicitly-set DATABASE_URL (e.g. migrating a remote DB) wins over .env files
const hasExplicitUrl = !!process.env.DATABASE_URL;
// Load .env.local first (Next.js convention) — override any defaults
config({ path: path.resolve(process.cwd(), ".env.local"), override: !hasExplicitUrl });
// Then load .env as fallback
config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
