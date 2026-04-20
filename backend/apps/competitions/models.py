"""Competitions app models — stub for Sprint 1.

Full implementation in Sprint 4 (competitions, entries, catch logs, leaderboard).

The leaderboard is a materialized view refreshed by Celery Beat every hour.
See: 03-Technical-Product/04-Database-Schema.md § 10. Materialized Views
"""
# Sprint 4 will add:
#   Competition, CompetitionEntry, CatchLog
#   Materialized view: competition_leaderboard (managed via RunSQL migration)
