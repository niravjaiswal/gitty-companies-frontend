# DevProbe Build Progress

Repo note: this workspace is a Vite + React MVP. The later Next.js/Prisma spec was not adopted in this branch.

## Phase 1 - Foundation
- [x] Project scaffold and Vite routing
- [x] Candidate and recruiter entry points
- [x] Supabase auth wiring
- [x] Demo-mode fallback for missing backend URL
- [x] Environment variable documentation
- [x] CI workflow for lint, test, and build

## Phase 2 - Core MVP
- [x] Recruiter dashboard, create flow, and invite flow
- [x] Candidate dashboard and assessment session flow
- [x] Browser IDE and terminal surface
- [x] Persistent local MVP data model
- [ ] End-to-end report export
- [ ] Live backend integration for execution and session APIs

## Phase 3 - Quality Gate
- [x] Build passes locally
- [x] Unit tests pass locally
- [x] Lint passes with warnings only
- [ ] Bundle budget review and code splitting pass
- [ ] Playwright coverage for the main candidate and recruiter flows

## Current Risks
- Demo mode is local-storage backed until a real backend is configured.
- A few shared UI modules still emit React Refresh warnings in ESLint.
- The app still uses a frontend-only architecture, so backend features are simulated unless `VITE_API_URL` is set.
