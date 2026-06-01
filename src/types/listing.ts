export type ListingStatus = "sold" | "active";

export type SampleListing = {
  id: string;
  slug: string;
  title: string;
  price: string;
  location: string;
  time: string;
  image: string;
  fallback: string;
  status: "sold";
  isSample: true;
  views: number;
};
