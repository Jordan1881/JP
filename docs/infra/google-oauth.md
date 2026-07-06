# Google sign-in (Cognito federated identity)

JP supports **Continue with Google** when the Cognito user pool has a Google identity provider and the frontend has the OAuth domain configured.

LinkedIn sign-in is **out of scope** (PRD). LinkedIn job imports use **Paste text** only.

## 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. **Create credentials** → **OAuth client ID** → **Web application**
3. **Authorized JavaScript origins**
   - `http://localhost:3000`
   - `https://main.dbkqz2plarhlv.amplifyapp.com`
4. **Authorized redirect URIs** — Cognito IdP callback (not your Next.js app):

   ```
   https://<COGNITO_OAUTH_DOMAIN>/oauth2/idpresponse
   ```

   Example: `https://jp-123456789.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

   Get `<COGNITO_OAUTH_DOMAIN>` from CDK output **CognitoOAuthDomain** or Amplify env `NEXT_PUBLIC_COGNITO_DOMAIN`.

5. Copy **Client ID** and **Client secret**.

## 2. CDK deploy (wire Google → Cognito)

Set secrets locally or in GitHub Actions, then redeploy:

```bash
GOOGLE_OAUTH_CLIENT_ID=... \
GOOGLE_OAUTH_CLIENT_SECRET=... \
pnpm --filter @jp/infra exec cdk deploy
```

Or:

```bash
pnpm --filter @jp/infra exec cdk deploy \
  -c googleClientId=YOUR_CLIENT_ID \
  -c googleClientSecret=YOUR_CLIENT_SECRET
```

After deploy, confirm output **GoogleSignInEnabled** = `true`.

### GitHub Actions (optional)

Repo → **Settings** → **Secrets** → add:

| Secret | Used by |
|--------|---------|
| `GOOGLE_OAUTH_CLIENT_ID` | CDK deploy |
| `GOOGLE_OAUTH_CLIENT_SECRET` | CDK deploy |

## 3. Amplify environment variables

Add to branch `main` (same place as other Cognito vars):

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_COGNITO_DOMAIN` | `jp-123456789.auth.us-east-1.amazoncognito.com` |

Existing `NEXT_PUBLIC_COGNITO_*` pool/client/region vars stay unchanged.

Redeploy Amplify after adding the domain.

## 4. Verify

1. Open `/login` or `/register` — **Continue with Google** appears
2. Complete Google consent → lands on `/auth/callback` → home or **Finish your account**
3. Email/password register still works at `/register`

If the Google button is hidden, `NEXT_PUBLIC_COGNITO_DOMAIN` is missing or Google IdP was not deployed.

## Account linking (same email, Google + password)

When Google sign-in is enabled, CDK deploys a **Pre sign-up Lambda** that links a new Google login to an existing **native** Cognito user with the same email. After linking, both sign-in methods share one Cognito `sub`, so JP jobs and profile stay unified.

**Does not retroactively merge** accounts that already signed up separately (e.g. an older `Google_*` user and a native user). For existing duplicates, use AWS Console or CLI:

```bash
aws cognito-idp admin-link-provider-for-user \
  --user-pool-id us-east-1_XXXX \
  --destination-user ProviderName=Cognito,ProviderAttributeValue=NATIVE_USERNAME \
  --source-user ProviderName=Google,ProviderAttributeName=Cognito_Subject,ProviderAttributeValue=GOOGLE_SUBJECT_ID
```

Then delete the orphan `Google_*` user if one was created before linking.

## LinkedIn job URLs

Automated URL import cannot read LinkedIn postings (bot protection; no public API for arbitrary job pages). Use **Paste text** on the add-job form — copy the description from LinkedIn in your browser.
