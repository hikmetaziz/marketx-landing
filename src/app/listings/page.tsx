import { permanentRedirect } from "next/navigation";

export default function LegacyListingsPage() {
  permanentRedirect("/elanlar");
}
