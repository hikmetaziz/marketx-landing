import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ListingDetailPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/elanlar/${encodeURIComponent(slug)}`);
}
