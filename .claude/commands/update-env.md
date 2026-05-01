Audit and sync all environment variables.

Steps:
1. Grep all .ts and .tsx files for `process.env.` to collect all used env vars:
   `grep -r "process\.env\." --include="*.ts" --include="*.tsx" . | grep -v node_modules`
2. Read `.env.example` (if it exists)
3. Find vars used in code but missing from `.env.example`
4. Add missing vars to `.env.example` with empty values and a descriptive comment
5. Find vars in `.env.example` that are no longer used in code — mark them with # UNUSED
6. Read `SETUP.md` (if it exists) and check if it documents all non-obvious vars
7. Report: added vars, potentially unused vars, total var count
