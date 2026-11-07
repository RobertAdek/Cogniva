# Cogniva architecture

## Product contract

Cogniva is a multi-user learning application with invitation-code-gated
registration for verified primary email addresses. Private learner workspaces,
source-grounded AI, and mandatory human review take priority over feature
breadth. Free private beta has no payment collection. No milestone is
private-beta ready until the release gates in the supplied brief pass.

## Initial implementation plan

1. Foundation: React/TypeScript web app, Clerk sessions, verified-email enrollment,
   PostgreSQL ownership boundaries, responsive navigation and persistent themes.
2. Core study slice: subjects → pasted or TXT/MD source → corrected and verified
   text → AI flashcard drafts with exact excerpts → human review → approved cards
   → persisted spaced reviews → objective quizzes and persisted results.
3. Extend ingestion with PDF/DOCX, vision/handwriting and timestamped audio using
   private App Storage and durable processing workers.
4. Add the grounded tutor, voice, adaptive learning and administration in the
   brief's phase order. Complete security/accessibility/recovery release gates
   before calling the application private-beta ready.

## Components and trust boundaries

- `artifacts/cogniva`: React + Tailwind web client. Browser cookies carry Clerk
  sessions; client role checks never authorize server operations.
- `artifacts/api-server`: Express API, Clerk proxy/middleware, request validation,
  ownership checks, grounding checks and the central AI gateway.
- `lib/api-spec/openapi.yaml`: API source of truth. Orval generates React Query
  hooks and Zod validation. Contract changes require code generation.
- `lib/db`: Drizzle schema and PostgreSQL. Learner-owned records carry an owner ID.
  Foreign keys, indexes and transactional review/submission changes preserve state.
- App Storage: original file bytes are private; PostgreSQL holds object paths,
  declared upload metadata and ownership. Signed upload URLs are short-lived.
- Managed OpenAI access: server-only configuration, bounded input, per-user daily
  reservations, persistent job records, structured output and exact-excerpt checks.

## Authentication and invitations

Clerk verifies identity and manages password reset, verification and sessions.
New enrollment requires a verified email and either a current three-minute code
derived server-side from the session secret or a valid email-bound single-use
invitation. The shared code only creates learners; a matching email-bound
invitation can assign its stored role during enrollment. Every private API
requires a locally enrolled account. Invitation tokens are cryptographically
random, stored as SHA-256 hashes, expiring, single-use and email-bound. An
operator-only CLI creates the first administrator invitation; there is no
public first-user-wins or self-assigned-admin path. Development and production
identities and invitations must be configured separately.

## Database domains

- Accounts: learners and hashed invitations.
- Knowledge: subjects, source versions, proposed cards, immutable review decisions
  and approved flashcards.
- Study: scheduled reviews, quizzes with private answer keys, objective submissions,
  and real learning events.
- Operations: private upload reservations, generation jobs and daily AI reservations.

## Administrator dashboard

The `/admin` workspace is an operational control view. Every `/api/admin`
request rechecks the current application-database administrator role; hiding
navigation is not the authorization boundary. Responses are private/no-store.
The view exposes enrollment identity, aggregate study counts, invitation status,
recorded AI usage, and processing-job totals. It deliberately excludes private
source titles/text, questions, answers, evidence, and storage paths. The shared
registration code is available only to administrators and rotates every three
minutes; individual email-bound invitation tokens are shown once to their issuer
and stored only as hashes. Administrators can issue/revoke email-bound invitations,
demote another administrator, edit default/per-account limits and feature flags,
and set a lifetime monetary cap. Self-demotion is forbidden.
Sensitive writes recheck authorization under a global transaction lock;
invitation redemption uses the same lock and a locked invitation row. Changes
and successful redemption are audited transactionally without study content.
The global lock serializes control changes, upload quota reservations and AI
quota/spend reservations. Every provider attempt consumes a conservative fixed
micro-USD ceiling before running, including eventual failures; no automatic
refund, cap reset, or provider retry can silently increase authorized spending.
An unfinalized reservation blocks that learner even after a crash or UTC-day
boundary. See SETUP.md for conservative pricing assumptions and operator recovery.

## Grounding and approval

Only a learner-verified source version may generate drafts. The server indexes
the original text into numbered passages. The AI selects a contiguous passage
range; the server copies the evidence directly from the original string.
This avoids failures caused by asking a model to reproduce source formatting.
Unknown, reversed, empty, or oversized ranges fail explicitly; evidence is never
fuzzy-matched, paraphrased, or synthesized to make validation pass.
Proposals never enter the approved card table automatically. Editing does not
silently approve a draft; edited claims are checked against evidence on approval.
Historical evidence is retained. Verification freezes a version's corrected text,
references and original object path. Replacement increments the version rather
than editing a snapshot. Affected drafts return to review; affected cards are
quarantined from study and new quizzes until exact-excerpt and AI grounding checks
plus human approval succeed. Existing card IDs are restored with a fresh schedule.
Completed quiz results remain historical snapshots; unfinished subject quizzes
are conservatively blocked on source replacement.


## Private ingestion

- TXT/MD/Markdown retain the existing editable browser-text workflow (1 MB,
  UTF-8, 50,000 characters). PDF, DOCX, PNG, JPEG, WebP, MP3, M4A and PCM WAV use durable extraction
  jobs after direct signed-URL uploads to private App Storage (20 MB maximum).
- Reservations require an active enrolled account, matching extension/MIME and
  per-user quotas of 100 reservations / 200 MB. Validation checks actual sizes and
  contents, not just browser metadata. Originals are copied from a pinned storage
  generation into never-signed private objects, so reusing an upload URL cannot
  mutate verified historical originals. Downloads check database ownership and
  use private/no-store responses. An explicit preview route only allows safe
  image/audio/PDF content inline, with byte-range playback. Legacy text uploads
  seal on first use. Upload reservations record affirmative rights confirmation;
  the client also displays privacy guidance before saving.
- PDF extraction retains page references (100-page maximum); scanned/short-text
  pages render to images for recognition. DOCX text retains paragraph positions,
  including gaps from empty paragraphs (500-paragraph maximum). ZIP expansion,
  XML entity declarations and image pixel counts are bounded.
- Every recognized image/scanned page and audio interval is marked uncertain,
  regardless of apparent readability. Recognition marks unclear spans rather than
  filling them in. Verification requires explicit per-segment review and an
  overall human confirmation; references cannot be altered by the client.
- PCM WAV is limited to 16-bit mono/stereo, 8–48 kHz, ten minutes and 20 MB.
  MP3/M4A are probed as audio-only containers and decoded using bounded FFmpeg
  child processes with fixed arguments, no network protocols and temporary-file
  cleanup. All recordings are limited to ten minutes / 20 MB.
  Transcription uses 30-second intervals with start/end references, not claimed
  word-aligned timestamps or speaker diarization. Local transcript language
  detection produces an estimated ISO 639-3 code, or `und` when uncertain, and is
  not treated as proof of transcription accuracy.
- Microphone capture uses explicit consent plus a user click, a visible indicator,
  stop/discard controls and a ten-minute sample-count cap. AudioWorklet captures
  local PCM and produces a mono 16 kHz WAV. Tracks stop on completion, discard,
  close/unmount and delayed permission resolution after cancellation. Nothing is
  uploaded until the learner saves; the original is available beside corrections.
- A database-backed worker claims jobs with row locks, renewable leases and
  fencing tokens. Every successful page/paragraph/audio interval is checkpointed.
  Failed jobs retain partial results and retry skips saved segments. Expired
  leases resume after a server restart, with ten attempts maximum. Processing
  continues while the API service is running; a stopped/scaled-to-zero service
  resumes on startup, not through an independent scheduler.
- Recognition/transcription use the existing server-side AI request allowance.
  Allowance failures are explicit and preserve completed intervals for later retry.
  Extraction is capped at 50,000 referenced characters; card drafting remains
  capped at 20,000 characters.

## Development and deployment

Use managed workflows for both services. Apply additive schema changes in
development with `pnpm --filter @workspace/db run push`. Replit's Publish flow
manages production schema changes; do not run DDL at application startup.
No destructive schema migration is authorized. Publishing requires the user action
and does not imply the private-beta release gates have passed.

## Remaining constraints

- Generation runs during the HTTP request with a persisted job/lease and safe
  duplicate prevention; ingestion runs separately in the resumable worker.
- Exact excerpt validation is not a proof of factual entailment; human review
  remains mandatory. This is not an automated fact-verification guarantee.
- Initial quizzes reuse approved card questions and shuffled approved answers;
  they are objectively graded. Difficulty controls question ordering rather than
  claiming validated adaptive difficulty.
- Clerk identity registration is separate from invitation-gated Cogniva enrollment.
  No inactive identity can access private records.
- Provider-invoice reconciliation, complete account export/deletion,
  invitation-management UI and production recovery drills remain
  release blockers.
