import type { SourceEntity } from "@tv/ir";

// ── Resume ─────────────────────────────────────────────────────────────
// An external artifact imported into the graph. The download files live
// in apps/shell/public/resume/.

export const RESUME_PDF_URL = "/resume/Rajat_Kumar_Resume.pdf";
export const RESUME_DOCX_URL = "/resume/Rajat_Kumar_Resume.docx";

export const RESUME: SourceEntity[] = [
  {
    id: "resume",
    kind: "resume",
    label: "Resume",
    summary: "import resume from \"./Rajat-Kumar.pdf\"",
    excerpt: "View or download resume in PDF/DOCX format.",
    tags: ["resume", "identity"],
    links: [
      { label: "Download PDF", url: RESUME_PDF_URL },
      { label: "Download DOCX", url: RESUME_DOCX_URL },
    ],
  },
];
