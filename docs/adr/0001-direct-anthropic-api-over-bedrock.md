# Direct Anthropic API over Bedrock for the JP agents

JP's three agents (profile interview, cover letter, job announcement) call the Anthropic API directly from Lambda, unlike Finlens which routes through Bedrock. The constraints differ: Finlens processes bank statements where in-region residency is binding; JP processes text the user deliberately submits for generation, so residency is not the binding constraint. The agents are the product's core, which makes the direct API's advantages decisive — newest models immediately and first-class SDK features (prompt caching, tool use) where Bedrock lags.

## Consequences

- We pay the secret-management cost Bedrock avoids: the API key lives in Secrets Manager (`jp/anthropic-api-key`), referenced by ARN in Lambda env, with `secretsmanager:GetSecretValue` scoped to execution roles (see `docs/infra/anthropic-secret.md`).
- All agent calls go through the shared `claude-api-client` module, so a later provider/routing change touches one module.
