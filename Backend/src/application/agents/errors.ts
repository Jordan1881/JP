export class AgentUseCaseError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 404 | 500 = 400,
  ) {
    super(message);
    this.name = "AgentUseCaseError";
  }
}
