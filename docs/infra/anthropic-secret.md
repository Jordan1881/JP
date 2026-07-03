# Anthropic API key for JP agents

JP agents (profile interview, cover letter, job announcement) **require** Anthropic credentials. There is no mock fallback — missing credentials fail at runtime with a clear error.

## Local development

Set `ANTHROPIC_API_KEY` in `.env.local` at the repo root (see `.env.example`):

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Lambda / production

Store the Claude API key in AWS Secrets Manager and reference the ARN in Lambda env:

```
ANTHROPIC_SECRET_ARN=arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:jp/anthropic-api-key
```

The CDK stack creates the secret placeholder `jp/anthropic-api-key`. Set the value in the AWS Console or CLI:

```bash
aws secretsmanager put-secret-value \
  --secret-id jp/anthropic-api-key \
  --secret-string '{"ANTHROPIC_API_KEY":"sk-ant-..."}'
```

Lambda execution roles are granted `secretsmanager:GetSecretValue` on this secret.

## Runtime behavior

`createClaudeClient()` resolves credentials in this order:

1. `ANTHROPIC_API_KEY` env var (local dev)
2. `ANTHROPIC_SECRET_ARN` → lazy fetch from Secrets Manager (cached per Lambda container)

If neither is set, the client throws immediately. Fetch or parse failures also throw — production and local dev never fall back to a mock client.

Model selection is centralized in the client: **Opus-tier** for the profile interview agent, **Sonnet-tier** for cover letter and job-announcement generation. Agents pass a tier (`interview` | `generation`), not raw model ids.
