# Bank certificate check — 28 October 2026

Direct TLS checks with SNI found:

| Host | Certificate expiry (UTC) | Result |
|---|---|---|
| kaligeo.by | 20 December 2026 11:09:55 | Chain verification OK |
| www.kaligeo.by | 20 December 2026 11:09:55 | SAN includes both main and www; chain verification OK |
| app.kaligeo.by | 20 December 2026 18:45:17 | Chain verification OK |
| kaligeo.ru | 18 October 2026 23:20:53 | Expired; verify code 10 |
| www.kaligeo.ru | 18 October 2026 23:20:53 | Expired; verify code 10 |

The initial local curl check saw Kaspersky replacement certificates and was not used to establish origin certificate validity. Direct openssl checks returned the origin Let's Encrypt YR2 chain with a cross-signed ISRG Root YR certificate issued by ISRG Root X1.

The bank's message does not identify the URL checked. If it was .ru, the expired certificate explains the failure. If it was .by, no matching defect was reproduced by the direct checks; exact URL and failure time are needed. An external SSL Labs check was initiated to inspect both A and AAAA endpoints; its final result should be checked separately.

Landing pages are hosted on hoster.by, not Vercel. Historical deployment instructions identify service 207878 for .ru and 217638 for .by. They recorded an old paid-through date, which is not evidence of current subscription status. Do not pay or renew hosting without checking current status and explicit authorization for payment.

No certificate configuration was changed. Browser MCP returned no connected browser, so the hosting control panel was not accessible. Do not continue terminal connectivity probing: local memory documents this as a monitored work laptop.
