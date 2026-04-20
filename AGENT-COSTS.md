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

---

## Cumulative Spend

| Sprint | Sprint Cost (est) | Sprint Cost (actual) | Cumulative |
|--------|------------------|---------------------|------------|
| 1 | $0.22 | TBD | TBD |

---

## Notes

- "Tokens (est)" is the pre-sprint estimate from SPRINT-1.md task table.
- "Tokens (actual)" must be filled in by the completing agent from session usage metrics.
- If an agent session is interrupted before completion, log partial tokens used and note the task ID where work stopped.
- All costs are for AI token usage only. Infrastructure is $0/month for Dev + UAT (all free tiers).
