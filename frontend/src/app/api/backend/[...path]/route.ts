import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (!["api", "health"].includes(path[0]))
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    // Next's internal URL can use 0.0.0.0 when bound to all interfaces.
    // Compare the browser's origin with the requested host, not that bind address.
    const expected =
      process.env.APP_ORIGIN ||
      `${request.nextUrl.protocol}//${request.headers.get("host")}`;
    if (origin && origin !== expected)
      return NextResponse.json({ detail: "Invalid origin" }, { status: 403 });
  }
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/${path.map(encodeURIComponent).join("/")}`,
      {
        method: request.method,
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": request.cookies.get("zoom_session")?.value || "",
          "X-Host-Api-Key":
            process.env.HOST_API_KEY || "local-development-only",
        },
        body: request.method === "GET" ? undefined : await request.text(),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    const data = await response.json();
    const sessionToken = data.session_token;
    const maxAge = data.max_age;
    delete data.session_token;
    delete data.max_age;
    const result = NextResponse.json(data, { status: response.status });
    result.headers.set("Cache-Control", "no-store");
    if (response.ok && sessionToken) {
      result.cookies.set("zoom_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge,
      });
    }
    if (
      response.ok &&
      path[1] === "auth" &&
      ["signout", "password"].includes(path[2])
    ) {
      result.cookies.set("zoom_session", "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
    }
    return result;
  } catch {
    return NextResponse.json(
      {
        detail: "The meeting service is unavailable. Please try again shortly.",
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH };
