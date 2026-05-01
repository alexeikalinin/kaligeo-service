Create a new AI client for platform: $ARGUMENTS

Steps:
1. Read `lib/ai-clients/types.ts` to understand the AIClient interface
2. Read an existing client (e.g. `lib/ai-clients/perplexity.ts`) as a reference pattern
3. Create `lib/ai-clients/<platform_lowercase>.ts` implementing the AIClient interface
4. Add the new client to `lib/ai-clients/index.ts` in the AI_CLIENTS record
5. Check `prisma/schema.prisma` — verify the Platform enum includes the platform name in uppercase
6. Add required env vars to `.env.example` with placeholder values and comments
7. Update `.progress/state.json`: move the client file to completedFiles
