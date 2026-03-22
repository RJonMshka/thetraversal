import type { Metadata } from "next";
import { jetbrainsMono, ebGaramond } from "@/lib/fonts";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "The Traversal — Rajat Kumar",
  description:
    "An interactive AST-based developer portfolio. Traverse the Abstract Syntax Tree to discover who Rajat is.",
  openGraph: {
    title: "The Traversal — Rajat Kumar",
    description:
      "An interactive AST-based developer portfolio. Traverse the Abstract Syntax Tree to discover who Rajat is.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${ebGaramond.variable}`}
    >
      <body className="min-h-screen bg-ctp-base text-ctp-text font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
