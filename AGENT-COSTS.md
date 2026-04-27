# AGENT-COSTS.md — SeaConnect AI Agent Cost & Token Tracker
**Purpose:** Track token consumption and estimated cost per sprint per agent, to stay within budget.  
**Updated by:** The agent completing work for each sprint, in Task D-3.  
**Budget rule:** Each agent must check remaining daily budget before starting. Stop and report if the session would exceed 150,000 tokens.

---

## Budget Policy

| Period | Token Budget | Approx Cost (Claude Sonnet 4.5) | Action if Exceeded |
|--------|-------------|--------------------------------|-------------------|
| Per agent session | 150,000 tokens | ~$2.25 | Stop, report in HANDOFFS.md, continue next session |
| Per sprint | 500,000 tokens | ~$7.50 | Escalate to human — re-scope sprint |
| Per month | 2,000,000 tokens | ~$30 | Hard stop — review scope with founder |

*Cost estimates based on Claude Sonnet 4.x at ~$1.50/M input tokens, ~$7.50/M output tokens, blended ~$3/M total.*

---

## Token Log by Sprint

| Sprint | Phase | Agent | Task IDs | Tokens (est) | Tokens (actual) | Cost (est) | Date | Notes |
|--------|-------|-------|----------|-------------|----------------|-----------|------|-------|
| 1 | A | devops-infrastructure-specialist | A-1 through A-10 | 15,500 | TBD | ~$0.05 | 2026-04-20 | Docker, CI/CD, env files |
| 1 | B | backend-api-developer | B-1 through B-14 | 37,000 | TBD | ~$0.11 | 2026-04-20 | Django scaffold, models, migrations |
| 1 | C | frontend-react-developer | C-1 through C-5 | 16,000 | TBD | ~$0.05 | 2026-04-20 | Next.js, i18n, design tokens |
| 1 | D | technical-orchestrator-agent | D-1 through D-3 | 6,000 | TBD | ~$0.02 | 2026-04-20 | Verification + handoffs |
| **1** | **Total** | **All** | **30 tasks** | **~74,500** | **TBD** | **~$0.22** | **2026-04-20** | **Sprint 1 scaffolding** |
| 2 | A | api-endpoint-agent | A-1 through A-4 | 15,000 | TBD | ~$0.05 | 2026-04-21 | Auth endpoints (register, login, refresh, logout, /me) |
| 2 | B | django-model-agent | B-1 through B-2 | 13,000 | TBD | ~$0.04 | 2026-04-21 | Yacht + YachtMedia models and serializers |
| 2 | B | api-endpoint-agent | B-3 through B-4 | 11,000 | TBD | ~$0.03 | 2026-04-21 | Yacht list/detail views, filter, seed command |
| 2 | C+D | nextjs-page-agent | C-1 through D-3 | 43,500 | TBD | ~$0.13 | 2026-04-21 | Auth UI, yacht web pages |
| 2 | E | test-writer-agent | E-1 through E-2 | 20,000 | TBD | ~$0.06 | 2026-04-21 | Auth + yacht endpoint tests |
| 2 | F | security-audit-agent | F-1 | 10,000 | TBD | ~$0.03 | 2026-04-21 | Auth security review |
| 2 | F | rtl-audit-agent | F-2 | 6,000 | TBD | ~$0.02 | 2026-04-21 | RTL audit of auth and yacht pages |
| **2** | **Total** | **All** | **22 tasks** | **~118,500** | **TBD** | **~$0.36** | **2026-04-21** | **Auth + Listings Foundation** |
| 3 | A | django-model-agent | A-1 through A-2 | 22,000 | TBD | ~$0.07 | 2026-04-27 | Availability + Booking + BookingEvent models, BookingService state machine |
| 3 | B | api-endpoint-agent | B-1 through B-3 | 25,000 | TBD | ~$0.08 | 2026-04-27 | Booking serializers, views, permissions, URL routing, availability endpoint |
| 3 | C | nextjs-page-agent | C-1 through C-3 | 35,000 | TBD | ~$0.11 | 2026-04-27 | Booking form, list, detail with timeline; locked yacht-detail "Book Now" CTA |
| 3 | D | celery-task-agent | D-1 through D-2 | 12,000 | TBD | ~$0.04 | 2026-04-27 | Notification task + auto-expire beat task wired in config/celery.py |
| 3 | E | test-writer-agent | E-1 through E-2 | 25,000 | TBD | ~$0.08 | 2026-04-27 | 19 state-machine tests + 21 booking-API/availability tests (40 new) |
| 3 | F | security-audit-agent + rtl-audit-agent | F-1, F-2 (Sprint 2 carry-over) | 5,000 | TBD | ~$0.02 | 2026-04-27 | Sprint 2 audits closed: removed auth/verify/, added audit summary block |
| **3** | **Total** | **All** | **12 tasks** | **~124,000** | **TBD** | **~$0.40** | **2026-04-27** | **Booking flow + state machine + audits closed** |
| 4 | A | payment-integration-agent | A-1 through A-4 | 40,000 | TBD | ~$0.12 | 2026-04-27 | PaymentProvider ABC, FawryProvider, registry, Payment model + migration, initiate + webhook views with inline E-1 audit |
| 4 | B | nextjs-page-agent | B-1 through B-4 | 45,000 | TBD | ~$0.14 | 2026-04-27 | Owner role guard, sidebar, dashboard with KPI cards, booking list with confirm/decline, yacht list, new yacht form |
| 4 | C | (folded into A) | C-1 | 0 | n/a | $0.00 | 2026-04-27 | /api/v1/ports/ already shipped in Sprint 1 — verified, no work needed |
| 4 | D | test-writer-agent | D-1, D-2 | 25,000 | TBD | ~$0.08 | 2026-04-27 | 17 provider unit tests (mocked httpx), 9 payment-API tests, conftest fixtures appended |
| 4 | E | security-audit-agent | E-1 | 5,000 | TBD | ~$0.02 | 2026-04-27 | Inline 8-point audit summary in payments/views.py — all PASS |
| **4** | **Total** | **All** | **12 tasks** | **~115,000** | **TBD** | **~$0.36** | **2026-04-27** | **Payments + Owner Dashboard** |

---

## Cumulative Spend

| Sprint | Sprint Cost (est) | Sprint Cost (actual) | Cumulative |
|--------|------------------|---------------------|------------|
| 1 | $0.22 | TBD | TBD |
| 2 | $0.36 (est) | TBD | TBD |
| 3 | $0.40 (est) | TBD | TBD |
| 4 | $0.36 (est) | TBD | TBD |

---

## Notes

- "Tokens (est)" is the pre-sprint estimate from SPRINT-1.md task table.
- "Tokens (actual)" must be filled in by the completing agent from session usage metrics.
- If an agent session is interrupted before completion, log partial tokens used and note the task ID where work stopped.
- All costs are for AI token usage only. Infrastructure is $0/month for Dev + UAT (all free tiers).
