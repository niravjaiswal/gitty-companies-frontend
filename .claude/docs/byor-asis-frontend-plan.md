# BYOR (Bring Your Own Repo) — Frontend Plan

Generated: 2026-04-22
Status: PLANNING

## Context

Backend shipped BYOR-as-is in backend PR #10 (merged to `main` as `9b43ee6`). Public-repo HTTPS clone → filter → materialize into `assessments.workspace_files`. Full backend contract and constraints live in `backend/.claude/docs/byor-asis-plan.md`.

Frontend today is **unaware** of the new source type. One input labelled "Company GitHub codebase" exists in `CreateAssessment.tsx:310-325` but its own caption admits it is context-only: *"Reserved for future repo-aware generation. Today it's embedded in the brief as context only."* Nothing in the app sends `sourceType`, `sourceRepoUrl`, or `sourceRepoRef`. Nothing displays the commit SHA or repo URL afterwards.

This plan wires the existing backend contract end-to-end through the company-facing UI with the smallest correct change set.

## Backend contract (recap)

Confirmed in `backend/src/app/modules/assessments/assessmentRoutes.ts`:

Request fields (both POST and PATCH):
- `sourceType?: 'skeleton' | 'repo'`
- `sourceRepoUrl?: string` (maxLength 400)
- `sourceRepoRef?: string` (maxLength 200; default resolves to `'main'` server-side)

Response fields on every assessment:
- `sourceType: 'skeleton' | 'repo' | null` (null treated as `skeleton`)
- `sourceRepoUrl: string | null`
- `sourceRepoRef: string | null`
- `sourceRepoCommitSha: string | null` (set post-clone)
- `sourceRepoMetadata: { filesKept, filesDropped, bytesStored, droppedReasons } | null`

Validation errors (400) surface as `{ error: string }` with user-friendly messages from `REPO_INGEST_ERROR_MESSAGES` — e.g. "Repository URL is not a valid HTTPS URL.", "Only github.com, gitlab.com, and bitbucket.org repositories are supported." Unique error *codes* are not exposed over the wire. Frontend just renders `body.error`.

Combination rule: `sourceType: 'repo' + demoMode: true` → 400.

Behaviour: repo jobs go through the same `generation_status` state machine (`pending → processing → completed/failed`). The queue branches on `source_type` and the candidate session path is unchanged.

## UX shape

Two source modes are now first-class. Everywhere today's UI says "skeleton" we need to think "source":

1. **Builder** (`CreateAssessment.tsx`): add a segmented Source selector at the top of the builder step. Two options: *AI-generated from brief* (default) and *Public repo (as-is)*. Skeleton picker + parts + exam specifics are **skeleton-only** and collapse when repo mode is active. Repo mode shows URL + optional ref inputs with client-side validation mirroring the backend rules (HTTPS; github/gitlab/bitbucket; ref charset `/^[A-Za-z0-9._\-\/]+$/`; ≤200 chars). The existing "Company GitHub codebase" textarea is repurposed as *"Reference context (leave blank if you chose 'Public repo' above)"* — or simply hidden in repo mode. Submit path sends `sourceType`, `sourceRepoUrl`, `sourceRepoRef`.

2. **Generation screen** (`AssessmentGeneration.tsx`): branches on `sourceType`. Repo mode shows:
   - Repo URL (linkified to the origin host) in place of Skeleton
   - Commit SHA (once available) with monospace + copy button — replaces the skeleton label after completion
   - Copy text switches: *"Cloning and filtering the repo. This usually takes under 30 seconds."* instead of *"Generating workspace. This typically takes 2–4 minutes."*
   - Failure panel: no "edit brief" CTA (there is no brief); show "Edit repo URL" that returns to the builder

3. **Editor header** (`AssessmentEditor.tsx`): small "Source" badge — either `Skeleton · <id>` or `Repo · <host>/<path>@<short-sha>`. Low priority but cheap.

4. **Dashboard card** (`Dashboard.tsx`): optional, same badge. Defer to a polish pass unless trivially cheap.

## File-by-file changes

### 1. `src/pages/CreateAssessment.tsx` (biggest change)

- Add state: `sourceMode: 'ai' | 'repo'` (local name, maps to `sourceType`), `repoUrl`, `repoRef`, `repoValidationError: string | null`.
- Wrap the first-screen intake form so that once the user picks a source, the second screen only renders the panels that apply:
  - AI mode → keep today's panels unchanged (skeleton picker, prompt, parts).
  - Repo mode → replace the Skeleton and Generation-prompt panels with a single "Public repo source" panel showing URL + ref inputs and a small "What Gitty will do" explainer ("shallow clone → filter out `node_modules`, `.git`, `dist`, `.env*`, secrets → store a snapshot").
- Client-side validation before POST: run `new URL()`, check `protocol === 'https:'`, check host ∈ `['github.com','gitlab.com','bitbucket.org']` (strip `www.`). Ref: if present, match regex + length cap. On failure, block submit and show inline error.
- Adjust `handleSubmit` payload: in repo mode, send `sourceType: 'repo'`, `sourceRepoUrl`, `sourceRepoRef` (if provided); skip `skeletonId`, `sourceBrief`, `authoringConfig` (still required by the schema? — let's check below); drop `generateWorkspace` because backend already forces ingestion for repo source.
- Error surface: 400 from backend renders into `error` state as it does today (`body.error`) — no extra code needed since backend returns a human-readable string.

Open question: `authoringConfig.partCount` etc. is required on POST schema today. Either (a) backend accepts the current payload for repo mode and ignores authoring fields, or (b) we still send a minimal shape. **Verify:** POST handler path for `isRepoSource === true` — if it ignores authoringConfig, send a trivial default; if it rejects empty, keep sending `{ mode:'single', stages:[], partCount:1 }`. Either way this is a 1-line call-site choice, not a UX decision.

### 2. `src/pages/AssessmentGeneration.tsx`

- Extend `AssessmentSnapshot` interface with: `sourceType`, `sourceRepoUrl`, `sourceRepoRef`, `sourceRepoCommitSha`, `sourceRepoMetadata` (all nullable).
- Derive `isRepoSource = assessment.sourceType === 'repo'`.
- Status grid (line 150-165): in repo mode, replace the "Skeleton" tile with "Repo" (linked host+path) and, once `sourceRepoCommitSha` is present, a "Commit" tile showing the short SHA with a copy button. Keep "Elapsed" and "Files" tiles.
- `PendingState`: branch copy by `isRepoSource`. Different expected-duration text.
- `FailedState`: in repo mode, replace "Edit brief" CTA with "Edit repo URL" that still routes to `/dashboard/create` (which, on the next iteration, will pre-fill from the assessment — out of scope for v1; acceptable to just let the user re-enter).
- `CompletedState`: no change needed, but we could surface repo metadata (`filesKept` / `bytesStored`) as small chips. Nice-to-have.

### 3. `src/pages/AssessmentEditor.tsx`

- Extend `AssessmentDetail` with same new fields.
- Header: add a small "Source" badge next to title — `Skeleton · rest-api-express` or `Repo · github.com/acme/widget@deadbee`. One-line addition.
- No editor-behaviour change: `workspace_files` is source-agnostic.

### 4. `src/pages/Dashboard.tsx`

- Extend `AssessmentSummary` with `sourceType` (optional). Add a tiny pill on each assessment row. *Optional polish — keep behind a "later" checkbox if cost grows.*

### 5. Tests

- `frontend/src/pages/__tests__/CreateAssessment.test.tsx` — if one exists, extend; if not, **skip new test file**. The builder is heavy on vanilla DOM/React state, not a lot of value in dragging in a testing harness just for this. Manual browser check is the right level for V1.
- Add a small pure-function test file for the URL/ref client-side validator (`src/lib/repoSource.ts` new module) — deterministic, cheap, catches regressions. This is the only test I'd add.

## Proposed new module

`src/lib/repoSource.ts`:

```ts
export type RepoSourceValidation =
  | { ok: true; url: string; ref: string | undefined }
  | { ok: false; error: string };

export function validateRepoSource(urlInput: string, refInput: string): RepoSourceValidation;
```

Mirrors `parseAndValidateRepoUrl` + `validateRepoRef` from backend with identical rules, so the user gets inline feedback before the POST round-trip. Pair with a Vitest suite: happy paths (all three hosts), disallowed hosts, non-HTTPS, embedded credentials, bad refs.

## Milestones

**M1 — builder wiring (primary)**
- `repoSource.ts` + tests
- `CreateAssessment.tsx` source selector + repo fields + submit branching
- Manual smoke: create an assessment from a real public repo (e.g. `https://github.com/vercel/examples`), watch it flow to completion

**M2 — generation screen polish**
- `AssessmentGeneration.tsx` source-aware tiles, copy, failure CTA
- Exercise failure paths: disallowed host, nonexistent repo, repo > 5 MiB

**M3 — editor/dashboard badges (optional polish)**
- Small source pills; cheap if the spec stays trivial

**Ship after M2.** M3 can slide into a follow-up PR.

## Anti-goals (explicit)

- No token/private-repo flow.
- No anonymization UI (matches backend scope).
- No pre-fill of the builder from an existing assessment in failure state — v1 accepts re-entry.
- No live repo preview/tree-view before submit. If the user wants that, it's a separate feature.
- No multi-source tabs or provider-specific OAuth buttons. A plain URL input is the v1.

## Risks / unknowns

- **Backend payload strictness for repo mode.** Need to confirm whether the POST schema accepts missing/empty `instructionsMd`, `sourceBrief`, `authoringConfig` when `sourceType === 'repo'`. Grep `assessmentRoutes.ts` around line 364 before M1 coding; if required, keep sending innocuous defaults.
- **Ref quirks.** Backend `validateRepoRef` rejects SSH-style operators but allows slashes (`release/v1`) and dots (`v1.0.0`). Client-side regex must match or we'll show spurious errors.
- **Copy-to-clipboard** for commit SHA: `navigator.clipboard.writeText` is fine, but needs HTTPS context — dev env is localhost, which counts as secure. No extra plumbing.
