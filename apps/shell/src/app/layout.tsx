import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { jetbrainsMono, sourceSerif4 } from "@/lib/fonts";
import { FocusManager } from "@/components/chrome/FocusManager";
import { EasterEggOverlays } from "@/components/chrome/EasterEggOverlays";
import { ThemeInitializer } from "@/components/landing/ThemeInitializer";
import "@/styles/globals.css";

const BASE_URL = "https://thetraversal.vercel.app";

const DESCRIPTION =
  "The portfolio of Rajat Kumar, senior software engineer — structured as a traversable Abstract Syntax Tree. Compilers, AI engineering, and production frontend architecture.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "The Traversal — Rajat Kumar",
  description: DESCRIPTION,
  openGraph: {
    title: "The Traversal — Rajat Kumar",
    description: DESCRIPTION,
    type: "website",
    url: BASE_URL,
    siteName: "The Traversal",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Traversal — Rajat Kumar",
    description: DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
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
  jobTitle: "Senior Software Engineer",
  email: "mailto:rajat1996kumar@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Chicago",
    addressRegion: "IL",
    addressCountry: "US",
  },
  alumniOf: [
    {
      "@type": "CollegeOrUniversity",
      name: "University of Illinois at Chicago",
    },
    {
      "@type": "CollegeOrUniversity",
      name: "National Institute of Technology, Hamirpur",
    },
  ],
  sameAs: [
    "https://github.com/RJonMshka",
    "https://linkedin.com/in/rajatkjon",
  ],
  knowsAbout: [
    "TypeScript",
    "React",
    "Next.js",
    "Angular",
    "Node.js",
    "Python",
    "Go",
    "Compilers",
    "Micro Frontends",
    "Module Federation",
    "LLM Engineering",
    "Software Supply Chain Security",
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
 * │   │   ├── import: Resume                                │
 * │   │   └── import: Education                             │
 * │   ├── BlockStatement: Projects                          │
 * │   │   ├── FN: Reachble                                  │
 * │   │   ├── FN: MFKit                                     │
 * │   │   ├── FN: RESUMIND                                  │
 * │   │   └── FN: The Traversal                             │
 * │   ├── BlockStatement: Research                          │
 * │   ├── BlockStatement: Skills                            │
 * │   ├── VariableDeclaration: Timeline                     │
 * │   ├── ExpressionStatement: Philosophy                   │
 * │   └── ExportDeclaration: Connect                        │
 * │                                                         │
 * │   You found the source. The medium is the message.      │
 * │   https://github.com/RJonMshka/thetraversal             │
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
      className={`${jetbrainsMono.variable} ${sourceSerif4.variable}`}
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
        <ThemeInitializer />
        <FocusManager />
        <EasterEggOverlays />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
