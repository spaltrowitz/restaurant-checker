# Decision: Vitest as Test Framework

**Date:** 2026-04-30  
**Author:** McManus (Tester)  
**Status:** Implemented

## Context

The project had zero tests and no test framework. We needed something lightweight that works with Next.js + TypeScript out of the box.

## Decision

Adopted **Vitest** as the test runner.

- `npm test` → `vitest run` (single run, CI-friendly)
- `npm run test:watch` → `vitest` (watch mode for dev)
- Config: `vitest.config.ts` with `globals: true`
- Tests live alongside source: `lib/__tests__/matching.test.ts`

## Rationale

- Near-zero config for TypeScript + ESM
- Fast (native ESM, no transform overhead)
- Compatible API (jest-like, low learning curve)
- No conflict with existing Next.js build pipeline

## Impact

All team members should run `npm test` before pushing changes. The 38 existing tests cover the core matching logic and document 3 known bugs.
