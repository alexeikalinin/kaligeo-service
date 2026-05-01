# ADR-001: PDF Strategy

tags: #decision #pdf #technical

**Дата:** 2026-05-01  
**Статус:** Принято

## Решение

Использовать `@react-pdf/renderer` вместо Puppeteer.

## Контекст

Нужно генерировать PDF-отчёт из данных аудита. Было два варианта:
1. Puppeteer — рендерит HTML-страницу в PDF
2. @react-pdf/renderer — генерирует PDF программно через React-компоненты

## Причины выбора @react-pdf/renderer

- Уже был в `package.json`
- Работает в Vercel serverless без ограничений размера
- Нет холодного старта браузера (Puppeteer: +3-10 сек)
- Не нужен `@sparticuz/chromium` (50MB bundle)
- Файл генерируется за ~1-3 сек

## Недостатки

- PDF не совпадает pixel-perfect с HTML-отчётом
- Компонент нужно писать отдельно от UI компонентов

## Файлы

- `components/pdf/ReportPDFDocument.tsx`
- `app/api/report/generate-pdf/route.ts`
