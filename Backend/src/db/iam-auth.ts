import type { DatabaseConfig } from "./config.js";

/** True when Lambda should connect with RDS IAM auth tokens instead of a password. */
export function usesIamDatabaseAuth(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.DATABASE_USE_IAM_AUTH === "true";
}

/** Generate a short-lived RDS IAM auth token for the configured host/user. */
export async function getIamAuthToken(
  config: DatabaseConfig,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  if (!config.host) {
    throw new Error("IAM auth requires DATABASE_HOST");
  }

  const username = config.user ?? env.DATABASE_USER ?? "postgres";
  const port = config.port ?? 5432;
  const region =
    env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.CDK_DEFAULT_REGION;
  if (!region) {
    throw new Error(
      "IAM auth requires AWS_REGION (or AWS_DEFAULT_REGION) in the Lambda environment",
    );
  }

  const { Signer } = await import("@aws-sdk/rds-signer");
  const signer = new Signer({
    hostname: config.host,
    port,
    username,
    region,
  });
  return signer.getAuthToken();
}
