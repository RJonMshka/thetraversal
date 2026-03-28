import type { Metadata } from "next";
import { jetbrainsMono, ebGaramond } from "@/lib/fonts";
import { FocusManager } from "@/components/chrome/FocusManager";
import { EasterEggOverlays } from "@/components/chrome/EasterEggOverlays";
import "@/styles/globals.css";

const BASE_URL = "https://thetraversal.dev";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "The Traversal — Rajat Kumar",
  description:
    "An interactive AST-based developer portfolio. Traverse the Abstract Syntax Tree to discover who Rajat is.",
  openGraph: {
    title: "The Traversal — Rajat Kumar",
    description:
      "An interactive AST-based developer portfolio. Traverse the Abstract Syntax Tree to discover who Rajat is.",
    type: "website",
    url: BASE_URL,
    siteName: "The Traversal",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Traversal — Rajat Kumar",
    description:
      "An interactive AST-based developer portfolio. Traverse the Abstract Syntax Tree to discover who Rajat is.",
  },
  icons: {
    icon: "/favicon.svg",
  },
  alternates: {
    canonical: BASE_URL,
  },
};

// JSON-LD structured data — Person schema
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Rajat Kumar",
  url: BASE_URL,
  jobTitle: "Software Engineer",
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "University of Illinois at Chicago",
  },
  sameAs: [
    "https://github.com/rajatkumar",
    "https://linkedin.com/in/rajatkumar",
  ],
  knowsAbout: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Python",
    "Compilers",
    "Programming Languages",
  ],
};

/*
 * ┌─────────────────────────────────────────────────────────┐
 * │                                                         │
 * │              T H E   T R A V E R S A L                  │
 * │                                                         │
 * │   An AST-based portfolio by Rajat Kumar                 │
 * │                                                         │
 * │   ◯ RootNode                                            │
 * │   ├── ProgramNode: Identity                             │
 * │   ├── BlockStatement: Projects                          │
 * │   │   ├── FN: RESUMIND                                  │
 * │   │   ├── FN: Clause                                    │
 * │   │   ├── FN: AI Commit Generator                       │
 * │   │   └── FN: CRM Tool                                  │
 * │   ├── BlockStatement: Skills                            │
 * │   ├── VariableDeclaration: Timeline                     │
 * │   ├── ExpressionStatement: Philosophy                   │
 * │   └── ExportDeclaration: Connect                        │
 * │                                                         │
 * │   You found the source. The medium is the message.      │
 * │   https://github.com/rajatkumar/thetraversal            │
 * │                                                         │
 * └─────────────────────────────────────────────────────────┘
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${ebGaramond.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="min-h-screen bg-ctp-base text-ctp-text font-mono antialiased"
        suppressHydrationWarning
      >
        {/* Skip to main content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ctp-mantle focus:text-ctp-lavender focus:border focus:border-ctp-lavender focus:rounded focus:text-sm focus:font-mono"
        >
          Skip to main content
        </a>
        <FocusManager />
        <EasterEggOverlays />
        {children}
      </body>
    </html>
  );
}
