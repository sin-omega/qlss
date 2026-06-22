"use client";

import { useState } from "react";
import { LegalDialog } from "@/components/qlss/legal-dialog";

export function SiteFooter() {
  const [legalPage, setLegalPage] = useState<string | null>(null);

  const footerLinks = [
    { label: "privacy policy", page: "privacy" },
    { label: "terms of service", page: "tos" },
    { label: "report abuse", page: "abuse" },
  ];

  return (
    <>
      <footer className="px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>QLSS · short links</span>
        </div>
        <div className="flex items-center gap-3">
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
