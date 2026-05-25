# Leadgen Engine

This repository is a PNPM/Turbo monorepo for a lead generation engine with scraping/browser automation and database integrations.

## Current Classification

- Bucket: lead generation / data acquisition
- Proposed canonical repository name: `leadgen-engine`
- Current GitHub access from Codex: admin available
- Rename status: blocked only because the current GitHub connector does not expose repository settings/rename operations

## Stack Signals

Observed from `package.json`:

- Monorepo: PNPM workspaces with `apps/*` and `packages/*`
- Build orchestration: Turbo
- Runtime: Node.js 20+
- Browser automation / scraping: Playwright, Cheerio
- Database/client: Supabase JS, PostgreSQL package
- Language: TypeScript

## AI Agent Notes

Treat this as a data/lead acquisition system. Before changing behavior, inspect:

- `apps/*`
- `packages/*`
- scraper/browser automation code
- database package/schema
- environment variable requirements
- rate limiting and source-specific rules

## Cleanup Recommendation

Rename this repository to `leadgen-engine` when repository settings access is available.
