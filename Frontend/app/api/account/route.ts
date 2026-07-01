import {
  getDevUserAccountRepository,
  LOCAL_DEV_USER_ID,
} from "@jp/backend";
import type {
  CreateAccountInput,
  DeleteAccountInput,
  UpdateAccountInput,
} from "@jp/shared-types";
import { NextResponse } from "next/server";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function GET(request: Request) {
  try {
    const account = await getDevUserAccountRepository().get(getUserId(request));
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    return NextResponse.json({ account });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CreateAccountInput;
    const account = await getDevUserAccountRepository().create(
      getUserId(request),
      input,
    );
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create account";
    const status = message.includes("required") || message.includes("must be")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const input = (await request.json()) as UpdateAccountInput;
    const account = await getDevUserAccountRepository().update(
      getUserId(request),
      input,
    );
    return NextResponse.json({ account });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update account";
    const status = message.includes("required") || message.includes("not found")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const input = (await request.json()) as DeleteAccountInput;
    if (input.confirm !== true) {
      return NextResponse.json(
        { error: "Account deletion requires confirmation" },
        { status: 400 },
      );
    }
    await getDevUserAccountRepository().delete(getUserId(request));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete account";
    const status = message.includes("not found") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
