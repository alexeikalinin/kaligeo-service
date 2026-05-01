Add a completed audit to the KaliGEO knowledge vault for future reference and cross-niche analysis.

Usage: /vault-add-audit <jobId>

Steps:
1. Read `.progress/state.json` to find the project root
2. Fetch the audit job from the database using the jobId:
   - Query: `SELECT aj.*, r.* FROM AuditJob aj JOIN Report r ON r.jobId = aj.id WHERE aj.id = '$ARGUMENTS'`
   - Or read from Prisma: `npx ts-node -e "const {prisma} = require('./lib/prisma'); prisma.auditJob.findUnique({where:{id:'$ARGUMENTS'},include:{report:true}}).then(console.log)"`
3. Determine the niche folder name: lowercase, spaces → hyphens, max 30 chars
4. Create the directory structure:
   `vault/06-Clients/{niche}/{company-name}/`
5. Create `vault/06-Clients/{niche}/{company-name}/audit-{YYYY-MM-DD}.md` with this template:

```markdown
# {companyName} — AI Visibility Audit

tags: #client #{niche-tag} #audit-{YYYY}

**Дата:** {completedAt}
**Тариф:** {tier}
**Сайт:** {websiteUrl}
**Общий Score:** {overallScore}/100

## Платформы

| Платформа | Score | Citation Rate |
|---|---|---|
{platform rows from visibilityScores}

## Топ конкуренты

{competitor matrix top-5}

## Слабые места

{detected weakPoints}

## Инсайты для ниши

> Что характерно для этой ниши по данным аудита — заполнить вручную или через /vault-analyze-niche

## Ссылки

- Отчёт: {NEXT_PUBLIC_APP_URL}/report/{id}?token={reportToken}
- [[{niche} Niche Overview]] — сводка по нише

---
*Аудит добавлен автоматически через /vault-add-audit*
```

6. Create or update `vault/06-Clients/{niche}/Niche Overview.md`:
   - If exists: append new client to the "Клиенты" section
   - If not exists: create with template (see below)
7. Update `vault/06-Clients/Clients Index.md` — добавить строку с клиентом
8. Output: путь к созданному файлу и краткая сводка

Niche Overview template:
```markdown
# {Niche} — Niche Overview

tags: #niche #{niche-tag}

## Клиенты в этой нише

| Компания | Дата | Score | Тариф |
|---|---|---|---|

## Паттерны ниши

> Общие наблюдения — заполняется по мере накопления аудитов

## Конкуренты чаще всего упоминаемые AI

> Топ конкурентов по всем аудитам ниши

## Рекомендации для ниши

> Что работает лучше всего для AI-видимости в этой нише
```
