import { headers } from "next/headers";

// Derived from the incoming request rather than an env var, so the QR/share link
// always matches whatever domain the payer is actually browsing on (localhost in
// dev, whichever Vercel domain in prod) with no config to keep in sync.
export async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto =
    headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
