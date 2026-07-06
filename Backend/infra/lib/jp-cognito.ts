import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export type JpCognitoProps = {
  /** OAuth redirect URLs for the Next.js app (local + prod). */
  callbackUrls: string[];
  logoutUrls: string[];
  /** Google OAuth web client (optional — omit until Google Cloud credentials exist). */
  googleClientId?: string;
  googleClientSecret?: string;
};

export class JpCognito extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly hostedUiUrl: string;
  public readonly googleEnabled: boolean;

  constructor(scope: Construct, id: string, props: JpCognitoProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "jp-job-player",
      signInAliases: { email: true },
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const googleClientId = props.googleClientId?.trim();
    const googleClientSecret = props.googleClientSecret?.trim();
    this.googleEnabled = Boolean(googleClientId && googleClientSecret);

    let googleProvider: cognito.UserPoolIdentityProviderGoogle | undefined;
    if (this.googleEnabled) {
      googleProvider = new cognito.UserPoolIdentityProviderGoogle(
        this,
        "GoogleProvider",
        {
          userPool: this.userPool,
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
          scopes: ["openid", "email", "profile"],
          attributeMapping: {
            email: cognito.ProviderAttribute.GOOGLE_EMAIL,
            fullname: cognito.ProviderAttribute.GOOGLE_NAME,
          },
        },
      );
    }

    const supportedIdentityProviders: cognito.UserPoolClientIdentityProvider[] = [
      cognito.UserPoolClientIdentityProvider.COGNITO,
    ];
    if (this.googleEnabled) {
      supportedIdentityProviders.push(
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      );
    }

    this.userPoolClient = this.userPool.addClient("WebClient", {
      userPoolClientName: "jp-nextjs",
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: props.callbackUrls,
        logoutUrls: props.logoutUrls,
      },
      supportedIdentityProviders,
    });

    if (googleProvider) {
      this.userPoolClient.node.addDependency(googleProvider);
    }

    const domainPrefix = `jp-${stack.account}`;
    const domain = this.userPool.addDomain("Domain", {
      cognitoDomain: { domainPrefix },
    });

    this.hostedUiUrl = domain.baseUrl();
  }
}
