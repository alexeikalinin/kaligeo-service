Before generating an action plan for a new audit, inject niche context from previous audits.

This command is called automatically during audit pipeline analysis when similar niches exist in the vault.

Usage: /vault-niche-context <niche> <companyName>

Steps:
1. Run /vault-analyze-niche for the given niche
2. Find the top 3 most relevant insights:
   - Which platforms show highest citation rates in this niche
   - Which content types get cited most (FAQ, Schema, reviews, etc.)
   - What competitors the AI "prefers" in this niche
3. Return structured context for the action plan generator:

```json
{
  "nicheInsights": {
    "averageScore": 0,
    "topPlatforms": [],
    "commonWeakPoints": [],
    "effectiveStrategies": [],
    "mainCompetitors": []
  },
  "recommendation": "string — personalized advice based on niche history"
}
```

4. If no data: return empty nicheInsights with recommendation = "Первый аудит в нише"
