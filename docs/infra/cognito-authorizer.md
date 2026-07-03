# Cognito JWT authorizer (API Gateway)

Production API routes (`{proxy+}`) require a valid Cognito ID token. API Gateway validates the JWT **before** invoking `ApiHandler`; missing or invalid tokens receive `401 Unauthorized` without hitting Lambda.

## CDK wiring

`Backend/infra/lib/jp-stack.ts` attaches a `CognitoUserPoolsAuthorizer` to the `{proxy+}` proxy. `GET /health` is explicitly unauthenticated for ops probes.

### Hybrid pool reference

For stacks that already have a Cognito pool (e.g. production), pass the pool via env or CDK context — the stack does **not** import the full pool construct:

| Variable / context | Example |
|--------------------|---------|
| `COGNITO_USER_POOL_ARN` or `cognitoUserPoolArn` | `arn:aws:cognito-idp:us-east-1:123456789:userpool/us-east-1_AbCdEf` |
| `COGNITO_USER_POOL_ID` or `cognitoUserPoolId` | `us-east-1_AbCdEf` |

When unset, the authorizer uses the `JpCognito` pool created in the same stack.

Deploy example:

```bash
COGNITO_USER_POOL_ID=us-east-1_XXXX pnpm --filter @jp/infra exec cdk deploy
```

## Client → API identity

1. Amplify Auth issues an ID token after sign-in.
2. `authHeaders()` in `Frontend/lib/auth.ts` sends `Authorization: Bearer <idToken>` (and `x-user-id` for local dev fallback).
3. `proxyToBackend()` forwards `authorization` to API Gateway.
4. `getUserId()` in `Backend/src/handlers/auth.ts` reads `requestContext.authorizer.claims.sub`.

## Local development

Without API Gateway (in-memory dev stores), `x-user-id` remains the identity header. Production paths through `JP_API_URL` require the Bearer token.
