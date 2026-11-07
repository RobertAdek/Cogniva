# Cogniva

An AI learning workspace that turns learner-owned notes into reviewed, source-linked study material. New accounts require a verified email and a rotating invitation code.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string; `SESSION_SECRET` — sessions and rotating registration-code derivation
- `pnpm --filter @workspace/api-server run test` — study logic unit tests
- `SETUP.md` — first administrator invitation and operational setup

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/cogniva` — React web application
- `artifacts/api-server` — Clerk-backed API, grounding gateway, study logic and private storage
- `lib/db/src/schema` — accounts, knowledge and study schemas
- `lib/api-spec/openapi.yaml` — API contract; regenerate clients after changes
- `ARCHITECTURE.md` — architecture, trust boundaries and initial limitations
- `PROJECT_STATUS.md` — phased implementation and verification evidence

## Architecture decisions

- A Clerk identity becomes a Cogniva learner only after the server verifies the primary email and validates a current invitation code. The shared three-minute code creates learners only; matching email-bound invitations may assign their stored role. Signup inputs never assign roles.
- No first-user-wins administrator assignment. An operator creates an email-bound administrator invitation in the correct environment.
- Source text and AI outputs are untrusted data. Source verification and human approval are distinct explicit actions.
- Initial quizzes reuse approved cards with objective grading, rather than generating unreviewed new knowledge.
- Only claim tested ingestion formats. PDF/DOCX/PNG/JPEG/WebP/WAV/MP3/M4A have extraction checks; OCR and audio remain uncertain until reviewed. No word-aligned transcript or recognition-accuracy guarantee.

## Product

Implemented: subjects, pasted/TXT/MD sources, private PDF/DOCX/image/WAV/MP3/M4A ingestion, consent-aware microphone recording, resumable extraction, referenced correction, immutable source replacement/revalidation, grounded draft generation, review, approved flashcards, spaced reviews, persisted quizzes and real activity.
AI tutor, voice tutoring, adaptive learning and full administration remain later phases.

## User preferences

- Follow the supplied nine-phase brief; preserve completed functionality and keep architecture/status documentation current.
- Prefer real integrations and persistent data over placeholder interfaces. Never fake test results or beta-readiness claims.
- Free private beta with verified-email and rotating-code-gated registration; payments are disabled. Privacy, source integrity, human approval, cost control and maintainability are required.
- No destructive migrations without explicit authorization. Do not declare beta-ready until the specified release gates pass.

## Gotchas

- Production schema changes use the managed Publish flow, not startup-time DDL.
- Managed Clerk development and production users are separate; bootstrap each environment independently.
- Browser Clerk requests use session cookies, not manually attached bearer tokens.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
