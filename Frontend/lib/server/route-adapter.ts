import type { ErrorMapping } from "@jp/backend";
import { NextResponse } from "next/server";

export async function handleRoute<T>(
  fn: () => Promise<T>,
  options: {
    status?: number;
    mapError: (error: unknown) => ErrorMapping;
  },
): Promise<NextResponse> {
  try {
    const result = await fn();
    return NextResponse.json(result, { status: options.status ?? 200 });
  } catch (error) {
    const { statusCode, message } = options.mapError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
