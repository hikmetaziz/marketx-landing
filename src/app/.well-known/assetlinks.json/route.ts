import { buildAndroidAssetLinks, wellKnownJsonResponse } from "@/lib/deep-link/well-known";

export const dynamic = "force-static";

export function GET() {
  return wellKnownJsonResponse(buildAndroidAssetLinks());
}
