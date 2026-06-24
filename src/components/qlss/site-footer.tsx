"use client";

import { useState } from "react";
import { LegalDialog } from "@/components/qlss/legal-dialog";

export function SiteFooter() {
  const [legalPage, setLegalPage] = useState<"privacy" | "tos" | "abuse" | null>(null);

  const footerLinks = [
    { label: "privacy", page: "privacy" as const },
    { label: "terms", page: "tos" as const },
    { label: "report abuse", page: "abuse" as const },
  ];

  return (
    <>
      <footer className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 text-[11px] text-muted-foreground bg-background border-t border-border">
        <span>qlss · mit</span>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {footerLinks.map((link, i) => (
            <span key={link.page} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden="true">·</span>}
              <button
                type="button"
                onClick={() => setLegalPage(link.page)}
                className="footer-link hover:text-foreground transition-colors touch-target"
              >
                {link.label}
              </button>
            </span>
          ))}
        </div>
      </footer>
      <LegalDialog page={legalPage} onClose={() => setLegalPage(null)} />
    </>
  );
}
