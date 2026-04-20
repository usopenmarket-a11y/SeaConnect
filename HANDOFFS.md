# HANDOFFS.md — SeaConnect Agent Handoff Log
**Purpose:** Cross-agent communication. When an agent completes work that another agent depends on, it appends an entry here. Agents read this file at the start of every session.  
**Protocol:** Defined in `03-Technical-Product/13-Agent-Protocol.md` § 3.1  
**Format:** Append only. Never delete entries. Update `Status` field in place.

---

## Format Reference

```markdown
## HANDOFF-{YYYY-MM-DD}-{seq}

**Status:** READY | IN_PROGRESS | BLOCKED | DONE  
**From:** {agent-type}  
**To:** {agent-type}  
**Sprint:** {sprint-number}  
**Feature:** {feature name}

### What Was Completed
- Bullet 1
- Bullet 2
- Bullet 3 (max 3)

### Contract
Link to the API spec, ADR, or schema section this implements.

### How to Test
(shell command or curl that verifies the completed work)

### Response/Output Shape
(example JSON or output)
```

---

<!-- Sprint 1 handoffs will be appended here when Phase D completes -->
<!-- First real entry: HANDOFF-2026-04-27-001 (Sprint 1 → Sprint 2) -->
