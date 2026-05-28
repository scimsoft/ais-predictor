# AGENTS.md

## Cursor Cloud specific instructions

This is a greenfield repository (`ais-predictor`) for a maritime collision prediction application using AIS data. As of the initial setup, the repo contains only a `README.md` — no source code, build system, dependencies, or services have been added yet.

### Current state

- **No language/framework chosen yet** — no `package.json`, `requirements.txt`, `Cargo.toml`, or equivalent.
- **No services to start** — no backend, frontend, database, or Docker configuration.
- **No tests or linting configured.**

### When code is added

Once the first code and dependency files are committed, the update script (`SetupVmEnvironment`) should be revised to install those dependencies (e.g. `npm install`, `pip install -r requirements.txt`, etc.). Until then the update script is intentionally a no-op.
