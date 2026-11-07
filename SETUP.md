# Cogniva setup and operation

## First administrator

New Cogniva accounts require a verified primary email and an invitation code.
Administrators can copy the shared learner code from the Administration page; it
changes every three minutes. This code is generated server-side from
`SESSION_SECRET`, is never stored or exposed to learners, and does not grant
administrator access. A valid email-bound single-use invitation can also activate
an account and carries the role assigned by the administrator.

There is deliberately no automatic administrator assignment. An operator with
access to the intended environment's database creates an email-bound administrator
invitation before the intended first administrator activates Cogniva:

```sh
cd lib/db
node scripts/create-invite.mjs --email YOUR_VERIFIED_EMAIL --administrator
```

The command prints a one-time invitation token. Keep it private; only its SHA-256
hash is stored. The intended administrator must sign in with the matching verified
email and use either that one-time token or the current shared code. Cogniva
applies the invitation's stored role and consumes it transactionally. Create the
administrator invitation before that identity activates Cogniva; invitations
cannot change the role of an already active account. Tokens expire after seven
days. Repeat without `--administrator` for an email-bound learner invitation.
Run against the correct environment; development accounts do not create
production accounts. Do not copy development identity IDs into production.

After bootstrap, administrators use **Administration** to copy the rotating
learner code, issue email-bound learner or administrator invitations, and revoke
unused invitations. Every new account needs a verified email and either the
current shared learner code or a valid email-bound invitation. A matching
email-bound invitation assigns only its stored role. Codes are never accepted as
a role supplied by the user, and invitations cannot change the role of an
existing account. Administrators can demote another administrator to learner;
they cannot demote themselves, protecting the last administrator.
Demotion does not delete study data or grant anyone access to it. All privileged
writes recheck the role under the same database lock used for role revocation.

## Development

- Web: managed workflow `artifacts/cogniva: web`.
- API: managed workflow `artifacts/api-server: API Server`.
- Typecheck: `pnpm run typecheck`.
- Unit tests: `pnpm --filter @workspace/api-server run test`.
- Admin security/concurrency tests: `pnpm --filter @workspace/api-server run test:admin:live`.
  These use isolated, temporary PostgreSQL tables in a dedicated schema, real
  transactions and middleware, and fake external identity/storage/provider calls.
  They do not change the application's global controls, accounts, or spending.
- Live privacy/study route tests: `pnpm --filter @workspace/api-server run test:privacy:live`.
  These use the development database and managed AI (bounded billable requests),
  exercise real enrollment middleware with only the external Clerk identity SDK
  substituted, and clean up only their own records. Run the entire suite in order.
  They do not replace a real signed-in browser pass or production validation.
  Live AI/privacy/ingestion smoke tests require an administrator-configured budget
  with sufficient headroom and enabled features. They obey the cap; they never
  automatically raise it. Charges remain committed even after fixture cleanup.
- Additive development schema: `pnpm --filter @workspace/db run push`.
- API contract regeneration: `pnpm --filter @workspace/api-spec run codegen`.

Clerk, App Storage and managed OpenAI access are provisioned by Replit. Keys stay
server-side except Clerk's intended browser publishable key. No learner API keys
are requested. AI requests use Replit AI Integrations for OpenAI and are billed
to the builder's Replit credits.

## Initial supported study workflow

Create a subject; paste notes or upload a UTF-8 `.txt`/`.md` file; check/correct the
text; explicitly verify it; generate cards; review evidence; edit if needed;
explicitly approve cards; study and rate them; create a quiz once at least four
distinct approved answers exist. Quiz answers, attempts and results are stored.
No initial sample study data is inserted into any learner's private account.

## Configurable limits and AI spending

- Default 20 AI requests per learner per UTC day, with one concurrent request per
  learner across all AI features and UTC-day boundaries. Administrators configure
  defaults or per-account overrides for requests, upload count and upload bytes.
  Lower limits take effect on the next reservation and do not delete saved data.
- AI fails closed at a **$0 lifetime cap** until an administrator raises it.
  The global cap, defaults, overrides and feature flags are stored server-side.
  Amounts use integer micro-USD (1 USD = 1,000,000), maximum cap $2,000.
  AI reserves $1 per generation, evidence check or OCR page/image and $0.10 per
  audio interval of at most 30 seconds, before contacting the provider.
  These are deliberately conservative application spending ceilings, **not
  provider invoices**. They cover the bounded inputs and output-token maxima of
  the currently pinned models; provider retries are disabled. Reassess ceilings
  before changing models, provider pricing, request sizes, or output limits.
  Full reservations stay committed on success, invalid output, timeout or failure,
  and the cap never resets automatically. The cap cannot be lowered below
  commitments. Raising it authorizes additional lifetime spending.
  The administration screen shows commitments and remaining headroom.
- AI, generation, recognition/transcription and new-upload flags are enforced at
  reservation time. Switching a flag off does not cancel already reserved work.
  Browsing and studying saved content do not depend on these flags.
- A process crash may leave a reservation in `reserved` state; it remains charged
  and blocks further AI for that learner rather than risking overlapping calls.
  An operator must confirm the old provider call is no longer running before
  marking that reservation `uncertain` with a completion timestamp through an
  authorized database procedure. Never decrement the committed ledger to retry.
- Invitation creation/revocation/redemption, administrator demotion, quota changes
  and global-control changes have transactional audit records. Admin responses
  contain identity/operational metadata only, never private source text,
  study answers, evidence, original-file paths or stored invitation credentials.
- 20,000 characters per generation request; larger sources must be split.
- TXT/MD/Markdown uploads up to 1 MB; PDF/DOCX/PNG/JPEG/WebP/WAV/MP3/M4A up to 20 MB.
  Reservations count toward 200 MB / 100 uploads per learner.
  Sources are limited to 50,000 referenced characters; drafting to 20,000.
  WAV must be 16-bit PCM mono/stereo at 8–48 kHz, at most ten minutes.
  MP3/M4A must contain audio only and be at most ten minutes. FFmpeg must be
  available in the service runtime (configured in `.replit`). OCR/transcripts
  require explicit uncertainty review. In-app recording requires consent and is
  kept local until Save; original image/audio/PDF previews require authentication.
- Upload reservations and failed AI requests count toward their limits.
- Signed URL enforcement/cleanup for abandoned or oversized raw objects still
  requires hardening before beta.

## Release and recovery

The application is **not private-beta ready**. See PROJECT_STATUS.md and
ARCHITECTURE.md. Do not publish as a completed release without the remaining gates.
Use Replit's Publish flow for managed production schema changes; no startup DDL is
implemented. Before beta, document and rehearse database and object-storage backup,
restore, deletion and account recovery procedures, then validate production login,
invitation activation, cross-account isolation and persistence.
