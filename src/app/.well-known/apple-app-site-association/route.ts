import { buildAppleAppSiteAssociation, wellKnownJsonResponse } from "@/lib/deep-link/well-known";

export const dynamic = "force-static";

export function GET() {
  return wellKnownJsonResponse(buildAppleAppSiteAssociation());
}
