import { NextResponse } from "next/server";

export function lockedResponse(): NextResponse {
  return NextResponse.json(
    { error: "This bill is locked and can no longer be edited" },
    { status: 403 },
  );
}
