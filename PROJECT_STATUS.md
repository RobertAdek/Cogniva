# Cogniva implementation status

## Current milestone

Initial foundation and a deliberately bounded real study workflow have been implemented.
**Not private-beta ready.** Automated checks below cover the implemented slice,
not production readiness or general OCR/handwriting accuracy.

## Phase status

| Phase | Status |
| --- | --- |
| Foundation | Development invitation-to-quiz persistence and cross-account browser checks passed; production and real signup/email gates remain open |
| Knowledge Ingestion | Pasted/TXT/MD preserved; PDF/DOCX/PNG/JPEG/WebP/WAV/MP3/M4A, resumable extraction, consent-aware recording, referenced correction and immutable replacement |
| Knowledge Verification | Initial source-linked flashcard generation and review |
| Core Learning | Initial cards, spaced reviews and objective quizzes |
| AI Tutor | Not implemented |
| Voice Tutoring | Not implemented |
| Adaptive Learning | Not implemented |
| Administration | Operator bootstrap only; full controls deferred |
| Private Beta Readiness | Not passed |

## Service configuration

- Managed Clerk, managed OpenAI access, and App Storage have been provisioned.
- OpenAI usage is billed through Replit credits; no learner-supplied key is required.
- An email-bound development administrator invitation has been issued.
- Separate production authentication, bootstrap and persistence checks are required.

## Administrator dashboard

- `/admin` overview, searchable/paginated enrollments, filtered
  invitation records, recorded AI usage, and aggregate processing-job states.
- Administrator role is enforced independently on every server request.
- Private study content and invitation credentials are excluded from this view.
- Full workspace typecheck passed; server unit suite passed with 32 tests
  (plus one opt-in live-AI test skipped in the normal unit command).
- Development browser checks passed for administrator/learner boundaries,
  role revocation, search, invitation filters, refresh, invalid pagination,
  response-field privacy, and 390px local table scrolling/navigation dismissal.
- Production preflight found the merged ingestion table absent. Include the
  development schema changes in Publish before using the new view live;
  production data was not modified.
- Email-bound invitation creation/single-use activation/revocation, demotion of
  another administrator, global/default/per-account quotas, feature switches,
  and transactional sensitive-action audit records are implemented.
- AI defaults to a zero-dollar cap until configured. Conservative lifetime
  micro-USD reservations are atomic across users; failed calls remain charged.
  See SETUP.md for ceilings, operational recovery and provider-cost assumptions.
- Isolated PostgreSQL security tests cover cross-role denial, redemption/revoke
  races, budget races, quotas, feature switches and private-content exclusion.

## Verification evidence

- OpenAPI generated successfully. Its chained TypeScript check initially exposed
  missing DOM iterable typings in the shared API client; that configuration is fixed.
- Full workspace TypeScript check passed.
- Twelve unit tests passed for study scheduling, objective grading, exact source
  passage reconstruction, formatting/Unicode preservation, and invalid-range rejection.
- An opt-in live managed-AI smoke test passed: generated drafts from formatted
  synthetic notes retained evidence occurring exactly in the original source.
  This test does not establish semantic quality across all source types.
- Both web and API managed workflows started successfully.
- Public landing page rendered in a browser screenshot without application errors.
- API health endpoint returned HTTP 200.
- Anonymous subject reads and upload URL requests returned HTTP 401.
- These checks do not establish authenticated cross-account security, real AI
  generation quality, or full invitation-to-quiz persistence. Those gates remain open.


### Extended ingestion checks

- Additive development schema changes applied; OpenAPI regenerated.
- Full workspace TypeScript check passed after ingestion implementation.
- 22 default Vitest tests passed: existing study scheduling/grading plus UTF-8
  validation, real PDF/DOCX/image/WAV parsing, page/paragraph/time references,
  scanned-page rendering, uncertainty and successful-segment recovery.
- Five opt-in integration tests passed with the development database, real private
  App Storage and real OpenAI recognition/transcription. Fixtures covered TXT, MD,
  DOCX, text PDF, scanned PDF, PNG, JPEG, WebP and synthesized-speech WAV/MP3/M4A.
- Integration assertions covered upload idempotency, mismatched contents/limits,
  ownership denial, immutable originals after signed-URL overwrite, mandatory
  uncertain-segment review, expired-lease recovery, immutable version history,
  card/quiz quarantine, stale-version conflicts, rights confirmation, byte-range
  preview/playback and reapproval of an existing card. Editable TXT/MD and pasted
  note creation also passed independently of the processing pipeline.
- The integration test mounts test-only identity middleware in a standalone test
  app; it does not prove production Clerk authentication or replace the separate
  cross-account browser/persistence release gate.
- Run deterministic tests with `pnpm --filter @workspace/api-server run test`.
  Run live extraction checks with
  `RUN_INGESTION_INTEGRATION=1 pnpm --filter @workspace/api-server exec vitest run src/lib/ingestion.integration.test.ts`.
  Live checks require development DB/App Storage/AI configuration, FFmpeg and `espeak-ng`;
  they incur bounded provider usage and clean up their own test records/objects.
- Both managed services rebuilt and started cleanly. Production schema migration,
  deployment and production validation were not performed.
- A signed-in browser journey passed: PNG upload, extraction persistence after
  reload, explicit uncertainty/overall review gates, correction, verified
  replacement, immutable history after reload and authenticated original download.
  The separate sign-out/account-isolation release gate remains outstanding.
- A focused browser follow-up confirmed microphone consent never requests
  permission until Record is clicked, missing-device errors are explicit,
  upload-rights gating works, and a fresh original image renders beside correction.
  The browser environment had no microphone device, so live capture, generated
  local-WAV playback and runtime track-cleanup behavior were not hardware-tested.
  WAV format/transcription were exercised by the live integration fixtures.
- The web production build passed with the artifact's PORT/BASE_PATH supplied;
  the emitted public assets include the PCM recorder worklet.


### Private study persistence and isolation

- See [PRIVACY_VERIFICATION.md](PRIVACY_VERIFICATION.md) for the dated evidence,
  reproducible commands, exact scope and retained synthetic study record IDs.
- Nine opt-in route integration tests passed against the real development DB
  and managed AI. They cover actual enrollment middleware, invitation constraints,
  24 anonymous/unenrolled route combinations, 13 cross-account read/write attempts,
  explicit verification/edit/approval, saved reviews and quiz results, quota
  rejection, provider failure and expired/failed generation recovery.
  Only the external Clerk identity SDK is substituted in that standalone test app.
- One real-session browser pass plus a focused follow-up passed activation,
  subjects, pasted sources, real generation, editing and explicit approval,
  spaced review, quiz autosave/reload, unfinished answers surviving sign-out and
  same-account sign-in, completed results and a second learner's denial.
  Existing administrator privileges were left unchanged.
- Signup rendering was inspected signed out after bootstrap settled. Clerk test
  identities/sign-in were programmatic; signup submission, email delivery and
  password/recovery flows were not verified.
- Full workspace typecheck and 28 default API tests passed; both workflows served
  requests. The fork's missing locked dependencies and older development schema
  were brought up to date using the documented setup; no destructive migration,
  production change or application authorization bypass was introduced.

## Release blockers

The complete original brief remains the roadmap. Additional input formats,
account export/deletion, complete
production cross-account/persistence checks, accessibility
validation, backup/recovery procedures and published-app validation are not complete.
