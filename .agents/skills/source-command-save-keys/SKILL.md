---
name: source-command-save-keys
description: Save or locate KaliGEO API keys and synchronize missing production keys to Trigger.dev.
---

# KaliGEO keys

Project root: `/Users/alexei.kalinin/Documents/VibeCoding/kaligeo-service`.
Canonical store: `.env.keys.local` in that project, ignored by Git, mode 0600.

Use `scripts/save-keys.mjs` from the project root:
- `node scripts/save-keys.mjs --file /protected/input.env` saves locally.
- Append `--sync-trigger` to synchronize missing keys to project `proj_xqiwghrbsmrggjmorcyh`, environment `prod`.
- Alternatively supply dotenv input on stdin. Never put secret values in command arguments or print them.

The script validates values, rejects redactions/placeholders, atomically merges keys, preserves unrelated entries, adds only absent remote keys and reads them back. Existing conflicts are reported without overwrite. Resolve the current value before explicitly replacing a remote key. Local save and cloud sync are separate outcomes; report both. This script does not update Vercel.

When looking for keys, check `.env.keys.local`, `.env.local`, `.env`, then historical memory:
`/Users/alexei.kalinin/.claude/projects/-Users-alexei-kalinin-Documents-VibeCoding-kaligeo-service/memory/all_keys.md`.
The migrated `.Codex/projects/...` path is incorrect. Historical entries may be stale: validate candidates with the provider before treating them as current.

Never save `[SENSITIVE]` as a real key or treat a redacted export as proof that a provider key is invalid. Never commit secrets. Verify `git check-ignore .env.keys.local`. Report names, locations and verification status only. Authentication, available balance and actual operation are separate checks.

Run `node --test scripts/save-keys.test.mjs` for local validation and synchronization behavior.
