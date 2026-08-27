import type { MetadataRoute } from "next";
import { SITE_TAGLINE } from "@/lib/site";

// The install identity: what the launcher shows once someone adds the store to
// a home screen. start_url is "/" on purpose — a fresh launch still walks
// through the age gate like any other visit; installing buys no bypass.
export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_SITE_NAME || "YB Cannabis Co.";
  return {
    id: "/",
    name,
    short_name: process.env.NEXT_PUBLIC_SITE_SHORT_NAME || "YB",
    description: SITE_TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: "#f6fbf2",
    theme_color: "#f6fbf2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
