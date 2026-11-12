import { NextResponse, NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("portal_session_token");
  return response;
}
