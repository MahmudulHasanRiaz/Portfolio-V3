# Phase 02 — Risk Assessment Report

## Risk Matrix

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R01 | ~~exFAT filesystem blocks workspace deps~~ | ~~High~~ | ~~High~~ | ✅ **RESOLVED** — Repository moved to NTFS. Workspace linking functional. |
| R02 | Drizzle schema errors across 72 tables | Medium | High | Validate schema compilation per domain before proceeding |
| R03 | Migration ordering conflicts from parallel agent execution | Medium | Medium | Strict dependency graph; sequential batch generation |
| R04 | Polymorphic relationship complexity in Drizzle | Medium | Medium | Use helper functions for entity_type+entity_id pattern |
| R05 | JSONB column type mismatches | Low | Medium | Define shared type aliases for JSONB patterns |
| R06 | Enum definition conflicts across domains | Low | Medium | Single enums.ts file with domain-prefixed exports |
| R07 | Repository pattern inconsistency across 55 repos | Medium | Medium | BaseRepository enforces interface; code review gates |
| R08 | Seed data FK ordering failures | Low | High | Sequential seed scripts matching dependency order |
| R09 | Index duplication (unique constraint creates implicit index) | Low | Low | Review drizzle-kit output before applying migrations |
| R10 | Drizzle Kit version incompatibility with PostgreSQL 16 | Low | High | Pin drizzle-kit version; test with Supabase |

## Critical Path Risks

### R01: exFAT Filesystem — RESOLVED
**Status:** ✅ Repository moved to NTFS. Workspace linking and `npm install` now functional.

**Impact (resolved):** Can install all dependencies, compile, and verify database code.

### R03: Migration Ordering Conflicts
**Impact:** If agents work in parallel on migration batches, overlapping table references could cause ordering errors.

**Mitigation:** 
- All agents work from single dependency graph (PHASE02_IMPLEMENTATION_PLAN.md)
- Migration batches are generated in strict sequence
- Each batch validated before next batch starts
- Single agent owns migration generation

### R07: Repository Pattern Inconsistency
**Impact:** 55 repos could drift in implementation style, error handling, logging patterns.

**Mitigation:**
- BaseRepository enforces interface (findById, findAll, create, update, delete)
- Shared transaction wrapper in utils/transaction.ts
- Standardized error handling per SYSTEM_ARCHITECTURE.md
- Code review on every 5th repository

---

## Dependency Risks

| Dependency | Risk | Fallback |
|------------|------|----------|
| drizzle-orm | Package unavailable until NTFS | Write schemas, verify at install time |
| drizzle-kit | Cannot generate migrations until NTFS | Write manual SQL as backup |
| postgres.js | Connection can't be tested | Config layer is env-parametrized |
| Supabase PostgreSQL | Not configured in Phase 02 scope | Connection layer needs env vars only |

---

## Risk Verdict

| Category | Score | Notes |
|----------|-------|-------|
| Overall | MEDIUM | All risks are manageable |
| exFAT | RESOLVED | NTFS migration eliminated filesystem blocker |
| Schema complexity | LOW | Well-documented, 72 patterns established |
| Repository scale | MEDIUM | 55 repos with shared base is manageable |
| Migration | LOW | Sequential batches prevent conflicts |

**Phase 02 is safe to execute.** Risks are operational not architectural.
