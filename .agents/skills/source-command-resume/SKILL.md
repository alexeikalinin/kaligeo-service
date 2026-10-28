---
name: "source-command-resume"
description: "Migrated source command `resume`"
---

# source-command-resume

Use this skill when the user asks to run the migrated source command `resume`.

## Command Template

Read `.progress/state.json` and `.progress/log.md`.

Report:
1. Current phase and last updated date
2. What was completed in the last session (last ## Session block in log.md)
3. What is currently in progress
4. The next 3 highest-priority pending files from state.json

Then immediately begin implementing the highest-priority pending item from `pendingFiles`.
After completing each file, update `state.json`: move the file from `pendingFiles` to `completedFiles`, update `lastUpdated` to today's ISO date.
