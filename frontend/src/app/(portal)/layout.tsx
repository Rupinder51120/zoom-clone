import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("zoom_session")?.value;
  if (!token) redirect("/signin");
  let status: number;
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/auth/me`,
      {
        headers: {
          "X-Session-Token": token,
          "X-Host-Api-Key":
            process.env.HOST_API_KEY || "local-development-only",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    status = response.status;
  } catch {
    throw new Error(
      "The account service is unavailable. Please try again shortly.",
    );
  }
  if (status === 401 || status === 403) redirect("/signin");
  if (status !== 200)
    throw new Error(
      "The account service is unavailable. Please try again shortly.",
    );
  return <PortalShell>{children}</PortalShell>;
}
