# Scripts Overview

Scripts for FHETalk development tasks.

## Scripts

### `install.sh`
Installs all dependencies.
```bash
bash scripts/install.sh
```

### `build.sh`
Builds SDK, Next.js frontend, and contracts.
```bash
bash scripts/build.sh
```

### `setup.sh`
Complete setup: install + build + deploy + test.
```bash
bash scripts/setup.sh
```

### `deploy.sh`
Deploys contracts to Sepolia.
```bash
bash scripts/deploy.sh
```

### `test.sh`
Runs Hardhat contract tests.
```bash
bash scripts/test.sh
```

### `generateTsAbis.sh`
Generates TypeScript contract definitions.
```bash
bash scripts/generateTsAbis.sh
```

## Quick Reference

| Task | Script | pnpm Command |
|------|--------|--------------|
| Install | `install.sh` | `pnpm install` |
| Build | `build.sh` | `pnpm build:all` |
| Setup | `setup.sh` | `pnpm setup` |
| Deploy | `deploy.sh` | `pnpm deploy:sepolia` |
| Test | `test.sh` | `pnpm test:all` |
| Generate ABIs | `generateTsAbis.sh` | `pnpm generate` |

