import type { Metadata } from "next";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/chivo-mono/latin-500.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

const siteUrl = new URL("https://geomaxx-location-intelligence.vercel.app");
const title = "GeoMaxx | Expansion workspace";
const description =
  "Compare fictional Jakarta minimarket sites, inspect branch exposure, and prepare an evidence-backed field-visit brief.";
const socialImage = {
  url: "/og-image.png",
  secureUrl: new URL("/og-image.png", siteUrl).href,
  width: 1440,
  height: 1000,
  type: "image/png",
  alt: "GeoMaxx expansion workspace with a Jakarta map, three candidate sites, and Site A's evidence panel.",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title,
  description,
  applicationName: "GeoMaxx",
  authors: [{ name: "Irfan Kurnia", url: "https://github.com/IrfanKurnia33" }],
  creator: "Irfan Kurnia",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "GeoMaxx",
    title,
    description,
    locale: "en_US",
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: socialImage.url, alt: socialImage.alt }],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "16x16 32x32 48x48" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/logomark.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <noscript>
          <p className="no-script">
            JavaScript is required to edit this study. The study settings and
            map context remain available as reference.
          </p>
        </noscript>
      </body>
    </html>
  );
}
