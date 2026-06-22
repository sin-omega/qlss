"use client";

import { useState } from "react";
import { LegalDialog } from "@/components/qlss/legal-dialog";
import { t } from "@/lib/i18n";
import { useLocale } from "@/components/qlss/providers";

export function SiteFooter() {
  const { locale } = useLocale();
  const [legalPage, setLegalPage] = useState<"privacy" | "tos" | "abuse" | null>(null);

  const footerLinks = [
    { label: t(locale, "footer.privacy_policy"), page: "privacy" as const },
    { label: t(locale, "footer.terms_of_service"), page: "tos" as const },
    { label: t(locale, "footer.report_abuse"), page: "abuse" as const },
  ];

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-40 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-[11px] text-muted-foreground bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="flex items-center gap-2">
          <span>{t(locale, "footer.copyright")}</span>
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
