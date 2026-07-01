# JP — Job Player: Product Requirements Document

> Living PRD. Features are appended as sections in the order they are designed. Current section: **Feature 1 — Applications Tracker**.

---

## Feature 1 — Applications Tracker

### Problem Statement

Candidates searching for high-tech jobs apply to many roles in parallel across many companies. By the time a recruiter or interviewer calls back — sometimes weeks later — the candidate often can't remember which job it was, what stage the process was at, or what was already discussed. Their job search is scattered across email, memory, and scraps of notes, with no single place to see where every application actually stands.

### Solution

JP gives the candidate one searchable table of every job they've applied to. Each job tracks its own interview pipeline (from resume submission through to an outcome), with timestamps on every stage change. JP proactively flags applications that have gone quiet for too long, and provides a clear, non-destructive path for retiring applications that didn't go anywhere — while permanently preserving the record of ones that resulted in an offer or a rejection.

### User Stories

1. As a candidate, I want to see all my job applications in a single table, so that I have one place to check the status of my entire job search.
2. As a candidate, I want each row in the table to show the job title, company, and current stage, so that I can scan my pipeline at a glance.
3. As a candidate, I want the table sorted by last-updated date by default, so that applications needing my attention naturally float to the top.
4. As a candidate, I want to filter the table by current stage, so that I can see, for example, only the jobs currently at the Contract stage.
5. As a candidate, I want to search by company name, job title, or job number, so that when I get a call I can immediately find which application it relates to.
6. As a candidate, I want to click into a job and see a pipeline of interview stages, so that I can track exactly where that specific application stands.
7. As a candidate, I want to set a job's current stage to any stage in the pipeline (not forced in strict order), so that the tool matches how real interview processes actually vary between companies.
8. As a candidate, I want to move a job's stage backward if I made a mistake, so that I can correct my records without friction.
9. As a candidate, I want each stage change to be timestamped automatically, so that I have an accurate history of my process with each company.
10. As a candidate, I want to customize the list of interview stages in Settings (add, remove, rename, reorder), so that the pipeline matches my own job search process rather than a fixed template.
11. As a candidate, I want "Accepted" and "Rejected" to always be available as final outcomes regardless of my custom stage list, so that I can always close out an application definitively.
12. As a candidate, I want to enter a job's title, company name, job number (optional), job URL, job description, and resume submission date when I add it, so that I have full context on the application in one place.
13. As a candidate, I want the resume submission date I enter to also serve as the timestamp for the "Submitted resume" stage, so that I don't have to enter the same date twice.
14. As a candidate, I want a free-text notes field on each job, so that I can jot down interviewer names, salary discussions, or my own impressions as the process goes on.
15. As a candidate, I want to be notified when a job hasn't been updated in 14 days, so that I remember to check whether I've heard back.
16. As a candidate, I want that 14-day check to be based on the last time I updated any stage (or the submission date if no stage has been touched), so that the reminder reflects real inactivity, not an arbitrary fixed date.
17. As a candidate, I want to be reminded again every 14 days if I dismiss the notification without acting, so that a stale application never silently falls off my radar.
18. As a candidate, when I get a stale-application notification, I want the option to move the job to Archive, so that I can clear my active table of applications that clearly went nowhere.
19. As a candidate, I want notifications delivered in-app via a bell icon/notification center, so that I see them whenever I open JP, without needing email or push in v1.
20. As a candidate, I want a badge/indicator on the bell icon for notifications I haven't seen yet, so that I know I have something to review even if I dismissed it from view earlier.
21. As a candidate, I want to manually move a job to Archive at any time, so that I can clean up my active list even if the tool hasn't flagged it as stale.
22. As a candidate, I want a warning popup when I manually archive a job telling me it will be permanently deleted in 30 days, so that I'm never surprised by data loss.
23. As a candidate, I want a heads-up notification a few days before an archived job is permanently deleted (e.g. day 25 of 30), so that I have one last chance to save it if I need to.
24. As a candidate, I want to restore a job from Archive back to Active at any point before it's deleted, so that I can recover an application that turned out to still be alive (e.g. a late callback).
25. As a candidate, I want jobs marked Accepted or Rejected to be automatically moved to Archive, so that my active table only shows applications still in progress.
26. As a candidate, I want jobs marked Accepted or Rejected to be kept permanently in the Archive (no 30-day deletion), so that I retain a real historical record of my job search outcomes.
27. As a candidate, I want to permanently delete a job directly (bypassing Archive and its 30-day wait), so that I can remove a mistaken or duplicate entry immediately, with a confirmation prompt to prevent accidents.
28. As a candidate, I want the job URL I enter to be shown as a clickable link, so that I can quickly get back to the original posting.

### Implementation Decisions

**Modules** (conceptual — no tech stack chosen yet; each is a deep module with a narrow interface, testable in isolation):

1. **Job Repository** — owns CRUD for job records: create, update, query/list (with filter + sort + search params), permanent delete. Does not know about notifications or archive timing rules; just persists and retrieves job data.
2. **Stage Pipeline Manager** — owns the user's customizable stage list (per-user settings: add/remove/rename/reorder custom stages) and a job's current stage + stage-history timestamps. Setting a job's stage to "Accepted" or "Rejected" (fixed, non-customizable terminal actions) triggers a callback/event consumed by the Archive Lifecycle Manager. Allows non-sequential and backward stage transitions.
3. **Archive Lifecycle Manager** — owns all archive state transitions and rules: manual archive (reason=`manual`), stale-triggered archive (reason=`no_response`), and outcome archive (reason=`accepted` / `rejected`). Determines expiry: `manual`/`no_response` → 30-day deletion timer; `accepted`/`rejected` → no expiry (permanent). Exposes restore-to-active and is the sole authority for when a job becomes eligible for permanent deletion.
4. **Staleness Scheduler** — a daily background sweep over active jobs. For each job, computes days since last stage update; if ≥14 days, emits a (repeating) stale-notification event; independently, for archived jobs approaching their 30-day expiry, emits a pre-deletion warning event at day 25. Contains all the timing/threshold logic so it can be unit-tested without a real clock or UI — the sweep takes "now" as an input.
5. **Notification Center** — stores in-app notifications generated by the Staleness Scheduler (and the archive warning popups), tracks read/unread state per notification, and exposes the unread count for the bell badge.
6. **Search/Filter Engine** — given the full job list plus a query/filter/sort spec, returns the matching, ordered set. Search matches against company name, job title, and job number (substring/fuzzy — not exact match only). Supports filtering by current stage and defaults to sorting by last-updated date descending.

**Schema-level decisions:**

- A job record includes: title, company (free-text string), job number (optional, free-text), URL (plain string, rendered as a link), description (plain text), notes (single free-text field), submission date, current stage, stage history (stage → timestamp map/log), status (active / archived), archive reason (`manual` / `no_response` / `accepted` / `rejected`, only set when archived), archived-at timestamp, last-updated-at timestamp.
- Submission date and the "Submitted resume" stage timestamp are the same underlying field — not duplicated.
- The stage list is per-user (Settings), stored separately from any individual job's data, with "Accepted"/"Rejected" always available as fixed terminal actions independent of the user's custom list.
- No structured "company" entity in v1 — company is a plain string field (see Out of Scope).

**Notification delivery:** in-app only for v1 (bell icon + notification center). No email or push integration.

### Testing Decisions

All 6 modules will have tests, targeting external behavior (inputs/outputs and observable state changes) rather than internals, given the project's stated priority on accuracy and reliability:

- **Job Repository**: create/update/query/delete return and persist the correct data; queries respect filter/search/sort params.
- **Stage Pipeline Manager**: arbitrary (non-sequential, backward) stage transitions succeed and timestamp correctly; per-user custom stage lists are respected; setting Accepted/Rejected emits the expected event/trigger.
- **Archive Lifecycle Manager**: each archive reason applies the correct expiry rule (30-day vs. permanent); restore-to-active clears archive state; permanent-delete removes the record regardless of archive state.
- **Staleness Scheduler**: given a fixed "now" and a set of jobs with varying last-updated dates, produces exactly the expected stale/warning events — including the repeating 14-day behavior and the day-25 pre-deletion warning — with no reliance on real wall-clock time.
- **Notification Center**: notifications are stored, read/unread state transitions correctly, unread count matches expectations.
- **Search/Filter Engine**: search matches are correct (including partial/fuzzy matches) across company/title/job number; filter-by-stage and default sort-by-last-updated behave correctly in combination.

Since this is a greenfield project, there is no prior test suite to follow as precedent — these tests establish the initial testing conventions for the codebase.

### Out of Scope

- Structured/normalized "company" entity with autocomplete and de-duplication — deferred to v1.1. v1 uses a free-text company field with fuzzy/substring search.
- Email or push notifications — v1 is in-app (bell/notification center) only.
- Full-text search over job descriptions — search covers company, title, and job number only.
- Per-stage notes — notes are a single field per job, not per stage.
- Strict/enforced sequential stage progression — the pipeline is flexible; the app does not block skipping or reordering stages.
- Link-preview/scraping for job URLs — URLs are stored and shown as plain clickable links only.
- Rich-text formatting for job description/notes — plain text only.

### Further Notes

- This PRD is intentionally structured to have subsequent features appended as new top-level sections below this one, rather than as separate documents, so the whole product spec stays in one place as JP grows.
- The user has emphasized this project needs to be accurate, efficient, and error-free — this is the basis for testing all 6 modules rather than a subset, and should carry forward as a bar for future features added to this document.
- No issue tracker is connected yet (GitHub to be set up later) — this PRD lives at `docs/prd/PRD.md` for now and can be migrated/published once a tracker is available.

---

## Feature 2 — AI Agents, Profile & Account, Settings, Terms of Use, and Dashboard

### Problem Statement

Tracking applications (Feature 1) tells the candidate *where things stand*, but it doesn't help them *act* on that information. Candidates still have to write every cover letter from scratch, re-explain their background for every application, manually draft a "got the job" announcement, and have no way to see their job search's overall shape (how much they've applied, how much came back, where things tend to stall). There's also no account, settings, or legal foundation yet for a real product handling personal career data.

### Solution

JP adds three Claude-API-powered agents built on top of a single reusable career profile: an adaptive interview agent that builds the profile once, a cover-letter agent that drafts tailored letters per job, and a job-announcement agent that drafts a "new job" post once a job is marked Accepted. This is wrapped in a proper Profile/Account area, a Settings area (stage customization + notification controls), a Terms-of-Use acceptance flow with a legal consent record, and a dedicated Dashboard summarizing overall job-search outcomes.

### User Stories

29. As a new user, I want to complete a one-time adaptive interview about my background, so that I don't have to manually fill out a long form to bootstrap my profile.
30. As a user, I want the interview to adapt its follow-up questions based on my answers (e.g., skip backend-specific questions if I'm a designer), so that it feels relevant rather than like a generic form.
31. As a user, I want the interview to cover my tech stack, target roles/seniority, years of experience, location/remote preference, salary expectations, notable projects, soft skills/working style, and career narrative, so that my profile has everything needed for high-quality generated documents later.
32. As a user, I want my answers saved automatically once the interview is complete, so that I don't lose my progress or have to redo it.
33. As a user, I want the interview to run only once and not repeatedly re-prompt me, so that it doesn't get in the way after my profile is set up.
34. As a user, I want a Profile page where I can view and edit my career profile fields directly, so that I can update my information without redoing the full interview.
35. As a user, I want a separate Account area with my name, email, and profile photo, so that my basic identity info is managed apart from my career data.
36. As a user, I want to be able to delete my account, so that I can remove my data from JP if I choose to stop using it.
37. As a user, I want a "Generate Cover Letter" button on each job, so that I can quickly get a tailored draft based on that job's details and my profile.
38. As a user, I want the "Generate Cover Letter" button disabled until I've completed my profile interview, so that I don't get a low-quality, generic letter.
39. As a user, I want to ask for revisions in a follow-up chat (e.g., "make it shorter," "emphasize my leadership experience"), so that I can refine the draft without regenerating from scratch.
40. As a user, I want my generated cover letter saved on the job, so that I can reopen and re-read it later without paying to regenerate it.
41. As a user, I want a "Generate Announcement" button that appears on a job once it's marked Accepted, so that I can quickly draft a post about my new job.
42. As a user, I want the announcement to be draft text only, not published anywhere automatically, so that I stay in control of if/where/when it's posted.
43. As a user, I want to request revisions to the announcement in a follow-up chat, so that I can adjust tone or content before using it myself.
44. As a user, I want my generated announcement saved on the job, so that I can find it again later.
45. As a user, I want cover letters and announcement drafts deleted automatically when their job is deleted or expires from Archive, so that no orphaned data lingers in the system.
46. As a user, I want cover letters and announcements attached to permanently-archived Accepted/Rejected jobs to remain forever (since those jobs are never auto-deleted), so that I keep a full historical record of how I got there.
47. As a user, I want to edit my custom interview-stage list from Settings, so that I can tailor the pipeline stages to match my own job search process.
48. As a user, I want to toggle the stale-application and pre-deletion notifications on/off, so that I can control how much JP interrupts me.
49. As a user, I want to change my password from Settings, so that I can manage my own account security.
50. As a new user, I want to review and explicitly accept JP's Terms of Use before my account is created, so that I understand how my data is used and JP has clear evidence of my consent.
51. As JP, I want a record of which Terms version and when each user accepted it, so that there's a legal record of consent if it's ever needed.
52. As a user, I want to be re-prompted to accept updated Terms if they change, so that my consent stays current rather than assumed.
53. As a user, I want a dedicated Dashboard page, so that I can see an overview of my job search separate from my day-to-day application table.
54. As a user, I want to see total jobs applied, accepted, rejected, and no-response counts, so that I understand my overall outcomes at a glance.
55. As a user, I want to see a breakdown of how many active jobs currently sit at each pipeline stage, so that I can spot where my applications tend to stall.
56. As a user, I want these numbers to reflect all-time totals, so that I get a full picture without needing to configure a date range.

### Implementation Decisions

**Modules:**

1. **Profile Repository** — CRUD for the structured career profile: tech stack, target roles/seniority, years of experience, location/remote preference, salary expectations, notable projects, soft skills/working style, career narrative. Read by the Profile page UI and both generation agents.
2. **User Account Module** — owns account info (name, email, photo), the Terms-of-Use acceptance record (`terms_accepted_at`, `terms_version`), and account deletion (irreversible, confirmation-gated, consistent with Feature 1's approach to destructive actions).
3. **Profile Interview Agent** — an adaptive, loosely-bounded conversational loop covering the 8 profile topics above; tracks topic coverage internally; a single tool, `save_profile_data`, is called once (and only once — the interview runs one time per user, with no "redo" path) after all topics are covered, writing through the Profile Repository. Model tier: Opus-tier (capable model justified by this being a one-time, high-value data-capture step).
4. **Cover Letter Agent** — reads the Job Repository (job fields) and Profile Repository; one-shot generation followed by optional revision turns in the same short-lived chat context (no tools, no branching logic). Entry point is a per-job "Generate Cover Letter" button, disabled until the profile is complete. Output is persisted as a field on the job record, overwritten on regenerate. Model tier: Sonnet-tier.
5. **Job-Announcement Agent** — same shape as the Cover Letter Agent (reads Job + Profile, one-shot + revision chat, Sonnet-tier, output persisted on the job record, overwritten on regenerate). Entry point is a per-job "Generate Announcement" button that only appears once the job's stage is Accepted. Draft-only — no publishing/OAuth integration with any external platform in this PRD's scope.
6. **Claude API Client** — a shared thin wrapper around the Anthropic SDK used by all three agents: centralizes model selection per caller, retry handling on transient errors, and structured-output parsing, so individual agents don't reimplement API-call plumbing.
7. **User Preferences Module** — stores per-user notification toggles (stale-reminder on/off, pre-deletion-warning on/off), read by Feature 1's Staleness Scheduler before it emits a notification. The custom stage list remains owned by Feature 1's Stage Pipeline Manager; Settings only surfaces its existing editor — no duplicate module.
8. **Dashboard/Analytics Module** — a read-only aggregation layer over the Job Repository exposing one query (e.g. `getDashboardStats()`) returning total applied, total accepted, total rejected, total no-response (archived for that reason), and a count per active pipeline stage. All-time totals only, no date-range filtering. Rendered on its own dedicated page, separate from the main applications table.

**Other decisions:**

- Terms-of-Use acceptance is enforced at signup via a required checkbox (blocking account creation until accepted), recorded through the User Account Module; if `terms_version` is later bumped, the user is re-prompted to accept the new version.
- Cover-letter and announcement text live as plain fields on the Job entity (Feature 1's Job Repository) rather than a separate table — this is why they inherit the job's own deletion/archival lifecycle automatically, with no extra cleanup logic required.
- Model-tier assignment (Opus for the one-time interview agent, Sonnet for the two higher-frequency generation agents) is a starting point based on task complexity and call frequency, not a hard cost ceiling.

### Testing Decisions

All 8 modules will have tests, targeting external behavior rather than internals:

- **Profile Repository**: CRUD roundtrips persist and return the correct structured data.
- **User Account Module**: account-info updates persist; Terms acceptance is recorded with the correct version/timestamp; re-prompt logic triggers correctly when `terms_version` changes; account deletion removes the expected data.
- **Profile Interview Agent**: given a simulated conversation, all 8 topics are covered before `save_profile_data` fires, and it fires exactly once; irrelevant branches are correctly skipped; the agent cannot be re-triggered after the one-time interview is complete.
- **Cover Letter Agent** / **Job-Announcement Agent**: given fixed job + profile fixtures, generation output is correctly tied to that specific job; revision turns update the existing draft rather than starting a new one; the Job-Announcement Agent's entry point only activates once a job's stage is Accepted.
- **Claude API Client**: retry-on-transient-error behavior; correct model selection per caller; structured-output parsing correctness — tested against mocked API responses, not live calls.
- **User Preferences Module**: toggles persist and are correctly respected by the notification path (an integration point verifying Feature 1's Staleness Scheduler honors the toggle).
- **Dashboard/Analytics Module**: given a fixed set of job fixtures spanning stages and archive reasons, `getDashboardStats()` returns the exact expected counts.

As with Feature 1, there is no prior test suite to follow as precedent beyond what Feature 1 itself establishes.

### Out of Scope

- Resume/CV file upload — profile data is captured structurally via the interview agent instead.
- Re-running the full profile interview ("redo") — only manual form edits are supported after the initial one-time interview.
- Direct publishing integration (LinkedIn/social platform API, OAuth) for the Job-Announcement Agent — draft-only for this PRD.
- Version history of generated cover letters/announcements — only the latest generated version is kept per job.
- Date-range filtering or time-series trend metrics on the Dashboard (response rate %, average days-to-response, etc.) — all-time totals only.
- Theme/appearance settings.
- Drafting the actual Terms of Use legal text — a legal/business deliverable, not a product-design decision.

### Further Notes

- Terms of Use content itself still needs to be drafted/reviewed by legal counsel before launch; this PRD only specifies the acceptance *mechanism* (checkbox gate + versioned consent record), not the legal language.
- Model-tier choices are a starting recommendation, not a locked-in cost cap — revisit with the `ai-cost-optimizer` skill once real usage volume is available to measure actual spend.
- This feature builds directly on Feature 1's Job Repository (extended with cover-letter/announcement text fields) and Stage Pipeline Manager (reused for the Settings stage-editor and the Dashboard's per-stage breakdown) — neither is re-implemented independently here.
- As with Feature 1, subsequent features should continue to be appended to this same PRD document.

---

## Technical Architecture

Full detail lives in `docs/ARCHITECTURE.md`; summarized here for a single point of reference alongside the feature specs.

- **Frontend**: Next.js (App Router), React, TypeScript, GSAP for animation. Hosted on **AWS Amplify Hosting** (kept on the same cloud as the backend rather than splitting to Vercel). Three.js was considered but dropped from v1 — no concrete use case yet; may be revisited later for a specific visual (e.g., a landing page) rather than core app UI.
- **Backend**: TypeScript throughout. **AWS Lambda + API Gateway** for the API layer (serverless, scales to zero). **RDS/Aurora Serverless v2 Postgres** for the database — chosen over DynamoDB because the app's core access patterns (search, stage filtering, sort by last-updated, dashboard aggregation) are relational/SQL-shaped. **AWS Cognito** for auth, integrated with the Terms-of-Use acceptance gate at signup. **EventBridge Scheduler + Lambda** for the daily Staleness Scheduler sweep and the 30-day archive-deletion sweep. S3 reserved for future file storage (not needed in v1).
- **Infrastructure-as-Code**: **AWS CDK** (TypeScript), for stack-wide language consistency and real programming constructs over YAML.
- **Docker**: dropped from v1 — no server to containerize under this serverless architecture.
- **CI/CD**: **GitHub + GitHub Actions** — lint, typecheck, test, then deploy (CDK deploy for backend/infra, Amplify build for frontend).
- **Repository structure**: single monorepo (npm/pnpm workspaces) with three top-level workspaces — `Frontend/`, `Backend/` (including `Backend/infra` for CDK), and a dedicated `Tests/` folder structured to mirror `Frontend/`/`Backend/src/modules` 1:1 (colocated tests were considered and explicitly declined in favor of a dedicated, mirrored `Tests/` folder). Shared TypeScript types (job/profile/stage schemas) live in `Backend/src/shared-types` and are imported by `Frontend` as a workspace package, so both sides of the stack share one source of truth for data shapes.
