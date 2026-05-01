Run TypeScript type checking and fix all errors.

Steps:
1. Run: `npx tsc --noEmit 2>&1`
2. If there are errors, group them by file
3. For each file with errors, read the file and fix the type errors
4. Re-run `npx tsc --noEmit` after fixes
5. Repeat until the output is clean (exit code 0)
6. Report: how many errors were fixed and in which files
