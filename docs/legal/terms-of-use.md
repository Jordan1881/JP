# JP — Job Player: Terms of Use

**Version:** 1.0.0
**Effective date:** 2026-07-01
**Status:** FINAL — MVP waiver (see sign-off checklist below)

> This version string (`1.0.0`) is what the User Account Module stores as `terms_version` per user at signup. Any future material change to this document must bump the version (e.g. `1.1.0`) so existing users can be re-prompted to accept, per the PRD's Terms of Use decisions.

## 1. Acceptance of Terms

By creating an account with JP ("the Service"), you agree to these Terms of Use. You must accept these terms at signup before you can use the Service. If these terms are updated in a way that materially changes your rights or obligations, you will be prompted to review and accept the new version before continuing to use the Service.

## 2. Description of the Service

JP is a job-search tracking tool. It lets you log job applications, track interview stages, and use optional AI-assisted features (profile interview, cover letter generation, job-announcement drafting) powered by third-party AI models. JP is a personal organization tool — it does not submit applications, contact employers, or represent you in any interview process.

## 3. Your Account

- You must provide accurate information when creating your account.
- You are responsible for maintaining the confidentiality of your login credentials.
- You may delete your account at any time; see Section 6 (Data Deletion) for what happens to your data.

## 4. Your Data

### 4.1 What we store
JP stores the information you enter: job applications, company names, interview stages and dates, notes, your career profile (skills, experience, preferences you provide via the Profile Interview agent or manual entry), and any AI-generated content (cover letters, job announcements) you choose to generate and keep.

### 4.2 How we use it
Your data is used solely to provide the Service to you: displaying your application tracker, generating notifications, and powering the AI agents you invoke. We do not sell your data or use it to train AI models.

### 4.3 AI-Generated Content
JP integrates with a third-party large language model provider (currently Anthropic's Claude API) to power the Profile Interview, Cover Letter, and Job-Announcement agents.

- Content sent to the AI provider includes the inputs you provide (profile answers, job descriptions you paste in) needed to generate the requested output.
- AI-generated text (cover letters, job announcements, profile summaries) is a **draft, not a guarantee of quality or accuracy**. You are responsible for reviewing and editing any AI-generated content before using it externally (e.g. submitting a cover letter, posting an announcement).
- JP does not automatically publish or submit AI-generated content on your behalf; all such actions require you to manually copy, download, or post the content yourself.

## 5. Notifications

JP will notify you in-app when an application appears stale (no stage update for 14+ days) and before an archived job is permanently deleted. These notifications are informational only and do not constitute legal or career advice.

## 6. Data Deletion & Retention

- **Active and archived jobs:** Jobs you archive manually or that go stale without a response are automatically and permanently deleted 30 days after archiving, unless you restore them first.
- **Accepted/Rejected jobs:** Jobs archived with an outcome of Accepted or Rejected are retained indefinitely as a personal historical record, unless you delete them manually.
- **AI-generated documents:** Cover letters and job announcements are stored as fields on their associated job record. If that job is deleted (manually or via the 30-day archive expiry), its associated AI-generated content is permanently deleted at the same time — it is not retained separately.
- **Account deletion:** If you delete your account, all associated data (jobs, profile, generated content) is permanently deleted from our production database. Residual database backups are purged within 30 days of account deletion.

## 7. Third-Party Services

JP relies on third-party infrastructure and AI providers to operate, including but not limited to Amazon Web Services (hosting, database, authentication) and Anthropic (AI agent features). Your use of the Service is also subject to the acceptable-use terms of these providers where applicable to how JP uses them.

## 8. Disclaimer of Warranties

The Service, including all AI-generated content, is provided "as is" without warranties of any kind, express or implied. JP does not guarantee job-search outcomes, interview success, or the accuracy of AI-generated text.

## 9. Limitation of Liability

To the maximum extent permitted by law, JP and its operator are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including reliance on AI-generated content.

## 10. Changes to These Terms

We may update these Terms of Use from time to time. Material changes require renewed acceptance (see Section 1). The version number and effective date at the top of this document reflect the current terms.

## 11. Contact

For legal or privacy inquiries, contact **Yarden Biton** at **jordanstu21@gmail.com**.

---

**Sign-off checklist (tracked in issue #2):**
- [x] Reviewed by legal counsel, OR self-waived for MVP with rationale documented below
- [x] Placeholders in Sections 6 and 11 filled in
- [x] Effective date set
- [x] Version `1.0.0` confirmed as the launch version for `terms_version`

**Waiver rationale (if self-waived):** Solo pre-revenue MVP; standard SaaS ToU template adapted for JP's data and AI flows. Formal legal review deferred until paid users or revenue triggers require it.
