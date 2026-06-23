"use client";

import { useState } from "react";
import Link from "next/link";
import { LegalDialog } from "@/components/qlss/legal-dialog";
import { t } from "@/lib/i18n";

export function SiteFooter() {
  const [legalPage, setLegalPage] = useState<"privacy" | "tos" | "abuse" | null>(null);

  const footerLinks = [
    { label: t("footer.privacy_policy"), page: "privacy" as const },
    { label: t("footer.terms_of_service"), page: "tos" as const },
    { label: t("footer.report_abuse"), page: "abuse" as const },
  ];

  return (
    <>
      <footer className="mt-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 text-[11px] text-muted-foreground bg-background border-t border-border">
        <div className="flex items-center gap-2">
          <span>{t("footer.copyright")}</span>
          <span className="text-muted-foreground/30 select-none" aria-hidden="true">·</span>
          <Link
            href="/info"
            className="footer-link hover:text-foreground transition-colors touch-target"
          >
            {t("info.page_title")}
          </Link>
        </div>
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
