import type { Metadata } from "next";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/chivo-mono/latin-500.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoMaxx | Expansion workspace",
  description:
    "Compare fictional Jakarta minimarket sites, inspect branch exposure, and prepare an evidence-backed field-visit brief.",
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
