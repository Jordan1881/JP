# Anthropic API key for JP agents

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
