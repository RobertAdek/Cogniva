# Private study workflow verification

## Environment and scope

Development verification on 2026-10-16. No production deployment, production
schema changes, or production account access was performed. The development
database already contained one activated administrator; that account and its
privileges were not changed. Test learners receive only learner invitations.

The initial fork had source dependencies missing from `node_modules` and an older
development schema. `pnpm install --frozen-lockfile` restored the declared
dependencies; the documented `pnpm --filter @workspace/db run push` applied
additive development schema changes. Existing learner records were preserved.
The API worker's missing-schema errors stopped after this setup.

## Reproducible route integration checks

Run:

```sh
pnpm --filter @workspace/api-server run test:privacy:live
```

Requires the configured development database and managed OpenAI integration.
Provider calls incur bounded usage. Never target production. The suite creates
unique synthetic identities and cleans up only its own database records.

**Result: 9 tests passed.** Real PostgreSQL queries, transactions, enrollment
middleware, route handlers and AI gateway run in a standalone Express test app.
Only the external Clerk SDK identity lookup is substituted. The test-only header
is not recognized by the production server. This is not a test of Clerk's
cryptographic session verification, production middleware wiring, or browser
cookies; the separate browser pass addresses real development sessions.

Assertions:

1. Anonymous requests receive 401 and signed-in but unenrolled identities receive
   403 across 24 private route/method combinations: dashboard, subjects, sources,
   verification, generation, processing/retry, immutable versions, review queue,
   draft decisions, cards/review, quizzes/answers/submission and private storage.
2. Activation rejects an unverified primary email, expired/revoked invitations,
   an email mismatch and token reuse. Posting an administrator role with a learner
   invitation does not elevate privileges. The first identity is not implicitly
   an administrator.
3. Subject ownership cannot be set by request data. Source creation persists;
   generation before source verification is rejected. Explicit confirmation is
   mandatory and a verified version cannot silently be edited.
4. A synthetic exhausted allowance causes HTTP 429 and a persisted failed
   generation job, without drafts. After restoring only the fixture's allowance
   and simulating an expired processing lease, a real AI request reuses that job.
   At least four distinct-answer drafts are produced; each excerpt occurs exactly
   in the original text, and each question/answer passes a separate live
   entailment check against its evidence. Retrying a completed generation returns
   the same draft IDs, not duplicates. No card is automatically approved.
5. Editing does not approve. A deliberately unsupported answer about 999999
   seeds and Jupiter receives 422 on approval. Restoring the supported answer
   allows explicit approval. Repeated approval creates neither duplicate cards
   nor duplicate approval decisions.
6. A Good spaced-review rating persists a future due time and one repetition;
   the card disappears from the due-only query. Quiz creation hides answer keys
   and evidence before submission. Partial answers survive a new read. Duplicate,
   forged and incomplete answers are rejected. Objective submission with the
   fixture's correct answers produces 100%; resubmission is idempotent, completed
   answers cannot be changed, and only one completion event is written.
7. A second enrolled identity sees none of the owner's subjects, sources, cards,
   review queue, quizzes or activity. Thirteen cross-owner read/write attempts
   using real record IDs return 404; saved results and review schedule remain
   unchanged.
8. A controlled provider failure releases the AI reservation but still counts as
   a request. A concurrent request receives 429; the original completes. A
   synthetic daily limit prevents the provider callback from running, while
   saved quizzes and cards remain readable.
9. A controlled provider outage at the generation route produces HTTP 502, a
   persisted failed job and no drafts. Restoring the real provider and retrying
   completes that same job; drafts remain unapproved.

Controlled educational text describes a fictional garden experiment: amber,
cobalt, jade and violet trays contain 11, 23, 37 and 41 seeds; each receives
90 millilitres of water every morning for 12 days. No personal learner content is
sent to the provider by this suite. The entailment check is another AI request,
not independent scientific validation or a general factual-accuracy guarantee.

## Other checks

- Full workspace `pnpm run typecheck`: passed.
- Default API tests: 28 passed; the opt-in standalone AI smoke test was skipped.
  The live privacy suite above separately exercised actual generation and
  edited-claim checks.
- Both managed web/API workflows started. Proxied health returned HTTP 200;
  anonymous subjects returned HTTP 401.

## Browser evidence

One browser pass plus a focused persistence/bootstrap follow-up used real Clerk
development sessions with programmatic test-identity creation/sign-in. Login
claims were overridden using the supported Clerk testing mechanism, not
production authentication bypasses or local learner seeding.

**Result: the authenticated study/persistence/isolation checks passed.**

- Both new identities reached activation with `active:false`; private subjects
  returned 403. A short invalid code was blocked by client validation. Reusing
  A's consumed invitation from B failed at the API; B then activated using its
  own email-bound learner invitation. The administrator count remained one.
- A created a subject and pasted the controlled garden text through the UI,
  confirmed rights and explicitly verified source v1. Real generation returned
  six pending drafts and zero approved cards. Changing an answer to
  “Exactly 11 seeds” and saving kept it in draft status; four distinct-answer
  drafts were explicitly approved. Two remain pending.
- A revealed the amber answer and rated it Good. The server retained
  `repetitions:1`, `intervalDays:1` and future
  `dueAt:2026-10-17T02:10:36.854Z`.
- A created a four-question quiz, selected an answer and waited for
  “All selections saved.” Leaving/reloading/resuming retained the selection.
  Completing the quiz produced 4/4 correct (100%); reload and the quiz-list API
  retained the completed result.
- To verify the exact session boundary separately, A created one additional
  four-question quiz, selected only the cobalt answer “23 seeds,” waited for
  “All selections saved,” and signed out through the UI while it was unfinished.
  Signing in as the same identity and resuming retained `1 / 4 answered` and the
  selected answer. A fresh API read returned 200, `in_progress` and exactly one
  saved answer. Verified source, approved cards and the spaced-review schedule
  also survived. This quiz was deliberately left unfinished.
- After sign-out, auth/subjects returned 401 and the public landing page replaced
  the workspace. After switching to B, all private lists and dashboard activity
  were empty in both API responses and UI; A's content did not appear from the
  browser query cache. Reading A's source/version/processing/quiz or writing to
  A's verification, generation, draft review, card review and quiz answers/submit
  returned 404. Creating a source/quiz using A's subject also returned 404.
  Returning to A confirmed its source, cards, pending drafts, schedule and
  completed quiz were unchanged.
- The signed-out `/sign-up` page initially showed branding while Clerk loaded.
  At the 10-second follow-up capture the actual blank-field Clerk signup form
  was visible. Related resources returned 200 with no page errors or failed
  requests. The only console notices were development-key and autocomplete
  warnings. This was bootstrap latency, not a missing form.

Synthetic study record IDs retained in development for inspection:

| Record | ID |
| --- | --- |
| Subject | `db4beda5-1d7f-428c-b2f6-69889951446c` |
| Verified source | `d568ad58-f930-49ae-a6c2-e4d55da5030c` |
| Good-reviewed card | `962cd47d-a5fd-4398-a087-708083053690` |
| Completed quiz | `a8a3c95b-419a-4b5e-b2d0-a7a80f926701` |
| Unfinished quiz surviving sign-out/sign-in | `c7cd3819-0b88-4b4f-b3a6-462c04214ee2` |

Browser screenshot references: `z8xohg` (settled signed-out signup form) and
`i7ituy` (public landing after sign-out). No email addresses, invitation tokens,
credentials or session identifiers are recorded here.

### Limits of this evidence

Clerk signup form submission, email verification/delivery and password-based
login/recovery were **not** exercised. Account creation/sign-in was programmatic
as required by the Clerk browser-testing mechanism. The browser's consumed-token
denial does not distinguish single-use from email-binding rejection; the route
suite separately asserts each condition. No production, backup/restore or
general recognition-accuracy claim follows from these results.

The final aggregated log snapshot also included deployment-runtime health-check
errors and repeated source-worker database-poll errors. The development worker
did not show those errors after its schema setup. The separate deployment
runtime was not diagnosed or changed in this pass; its health must be checked
before any published-app readiness claim.

## Release decision

**Not private-beta ready.** These development checks do not establish production
authentication/persistence, email delivery, general recognition accuracy,
accessibility, operational backup/restore, account export/deletion or complete
administrator spending controls. Existing project tasks cover grounding
hardening, cited-passage navigation, invitations/budgets and ingestion gaps.
