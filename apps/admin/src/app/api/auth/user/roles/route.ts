import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.email) {
      return NextResponse.json({ roles: [] }, { status: 401 });
    }

    const { authorizeByEmail } = await import("@repo/auth/server");

    try {
      const user = await authorizeByEmail(session.user.email);
      const { getInternalRoles } = await import("@repo/auth/server");
      const roles = await getInternalRoles(user.id);
      return NextResponse.json({ roles });
    } catch {
      return NextResponse.json({ roles: [] });
    }
  } catch {
    return NextResponse.json({ roles: [] }, { status: 500 });
  }
}
