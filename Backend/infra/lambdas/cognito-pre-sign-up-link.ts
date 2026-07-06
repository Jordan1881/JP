import {
  AdminLinkProviderForUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { PreSignUpTriggerHandler } from "aws-lambda";
import {
  findNativeUserForLinking,
  parseFederatedUsername,
  shouldLinkExternalProvider,
} from "./cognito-pre-sign-up-link.logic.js";

const client = new CognitoIdentityProviderClient({});

export const handler: PreSignUpTriggerHandler = async (event) => {
  const email = event.request.userAttributes.email;

  if (!shouldLinkExternalProvider(event.triggerSource, email)) {
    return event;
  }

  const federated = parseFederatedUsername(event.userName);
  if (!federated) {
    console.warn("PreSignUp link skipped: could not parse federated username", {
      userName: event.userName,
    });
    return event;
  }

  const { Users } = await client.send(
    new ListUsersCommand({
      UserPoolId: event.userPoolId,
      Filter: `email = "${email}"`,
      Limit: 10,
    }),
  );

  const nativeUser = findNativeUserForLinking(Users ?? []);
  if (!nativeUser?.Username) {
    return event;
  }

  await client.send(
    new AdminLinkProviderForUserCommand({
      UserPoolId: event.userPoolId,
      DestinationUser: {
        ProviderName: "Cognito",
        ProviderAttributeValue: nativeUser.Username,
      },
      SourceUser: {
        ProviderName: federated.providerName,
        ProviderAttributeName: "Cognito_Subject",
        ProviderAttributeValue: federated.providerUserId,
      },
    }),
  );

  console.info("Linked federated sign-up to existing native user", {
    email,
    destinationUsername: nativeUser.Username,
    provider: federated.providerName,
  });

  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  return event;
};
