# Playwright Sharding Demo with Docker

This directory contains a minimal setup to demonstrate Playwright sharding across Docker containers.

## Quick Start

```bash
# Build and run sharded tests with 2 workers
docker-compose up --build

# View merged report
open merged-report/index.html
```

## How It Works

1. **docker-compose.yml** spins up N worker containers
2. Each worker runs `npx playwright test --shard=X/N`
3. Each shard outputs a `blob` report
4. The coordinator merges all blob reports into an HTML report

## Files

- `Dockerfile` - Playwright Docker image for workers
- `docker-compose.yml` - Orchestrates multiple shards
- `playwright.config.ts` - Playwright config with blob reporter
- `tests/` - Sample test files for sharding demo
