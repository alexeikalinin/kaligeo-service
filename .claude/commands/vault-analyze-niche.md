Analyze existing audits in the same niche to provide context for a new audit.

Usage: /vault-analyze-niche <niche>

Steps:
1. Search `vault/06-Clients/` for folders matching the niche keyword
2. Read all `audit-*.md` files found in matching folders
3. Extract from each: company name, score, platform scores, top competitors, weak points
4. Produce a niche intelligence report:

```
## Ниша: {niche}

### Статистика по {N} аудитам

Средний AI Score: X/100
Диапазон: X–Y
Лучший результат: {company} (score X)

### Конкуренты чаще всего упоминаемые AI

1. {competitor} — встречается в X из N аудитов
2. ...

### Общие слабые места в нише

- {weak point} — X из N компаний
- ...

### Что работало хорошо (у компаний со score > 50)

- ...

### Рекомендация для нового клиента

Учитывая данные ниши, приоритет: ...
```

5. If no previous audits found: report "Первый аудит в этой нише — данных для сравнения пока нет"
6. Save result to `vault/06-Clients/{niche}/Niche Overview.md` (update section "Паттерны ниши")
