# Knowledgebase: Content-Addressable Skills, Services & Patterns

A shared, content-addressable knowledgebase of verified operational skills, systemd/docker service recipes, and architecture patterns for [`ai-workflow`](https://github.com/dharmax/ai-workflow) and [`ai-cli`](https://github.com/dharmax/ai-cli).

---

## 🏛️ Architecture

All items are indexed in `manifest.json` and addressed via **SHA-256 content hashes**:
- **Services (`services/`)**: Hardened Linux service configurations, reverse proxies, and docker stacks.
- **Skills (`skills/`)**: Structured, verified operational procedures for terminal companions and coding agents.
- **Patterns (`patterns/`)**: Architectural design records, decoupling rules, and verified bug resolutions.

---

## 🚀 Building the Manifest

Generate or update `manifest.json` with deterministic SHA-256 hashes:

```bash
bun run build
```

---

## 🔍 Consumption

Clients (`aiwf`, `ai-cli`) query `manifest.json` via Fastly CDN on raw GitHub:
```
https://raw.githubusercontent.com/dharmax/knowledgebase/master/manifest.json
```
Fetched items are stored in a local unified cache (`~/.cache/dharmax-kb/`) by their `sha256` content hash for $<1\text{ms}$ resolution and instant offline availability.
