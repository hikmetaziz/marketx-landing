import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MarktX",
    short_name: "MarktX",
    description:
      "MarktX - Azərbaycanda elan və mağazaları bir yerdə kəşf etmək üçün mobil uyğun veb platforma.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icons/marktx-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/marktx-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
