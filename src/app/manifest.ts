import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rechnuvio – Kostenlose Rechner & Online-Tools",
    short_name: "Rechnuvio",
    description: "Einfach rechnen. Privat bleiben.",
    start_url: "/",
    scope: "/",
    lang: "de",
    display: "standalone",
    background_color: "#fbfbf7",
    theme_color: "#1e3fa6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
