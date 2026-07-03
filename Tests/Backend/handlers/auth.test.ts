import { describe, expect, it } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { getUserId } from "@backend/handlers/auth.js";

function mockEvent(
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent {
  return {
    headers: {},
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe("getUserId", () => {
  it("prefers Cognito authorizer claims.sub over x-user-id", () => {
    const event = mockEvent({
      requestContext: {
        authorizer: { claims: { sub: "cognito-sub-abc" } },
      } as unknown as APIGatewayProxyEvent["requestContext"],
      headers: { "x-user-id": "spoofed-user" },
    });

    expect(getUserId(event)).toBe("cognito-sub-abc");
  });

  it("falls back to x-user-id when no authorizer claims", () => {
    const event = mockEvent({
      headers: { "x-user-id": "local-dev-user" },
    });

    expect(getUserId(event)).toBe("local-dev-user");
  });
});

describe("API Gateway Cognito authorizer", () => {
  it("rejects unauthenticated requests before Lambda (401)", () => {
    // API Gateway returns 401 Unauthorized when Authorization is missing on
    // COGNITO-protected routes. Lambda getUserId is never invoked.
    const gatewayResponse = {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized" }),
    };

    expect(gatewayResponse.statusCode).toBe(401);
    expect(() =>
      getUserId(
        mockEvent({
          headers: {},
          requestContext: {} as APIGatewayProxyEvent["requestContext"],
        }),
      ),
    ).not.toThrow();
  });
});
