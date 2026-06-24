import Link from "next/link";

export default function TosPage() {
  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <div className="flex-1 flex flex-col items-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← back to QLSS
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-6">Terms of Service</h1>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p><strong className="text-foreground">1. Acceptance of Terms</strong><br />
            By accessing or using QLSS.eu ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

            <p><strong className="text-foreground">2. Description of Service</strong><br />
            QLSS provides URL shortening and markdown page hosting. Users may create short links and publish markdown content.</p>

            <p><strong className="text-foreground">3. User Conduct</strong><br />
            You agree not to use the Service for any unlawful purpose or in violation of any applicable laws. Prohibited uses include, but are not limited to: spamming, phishing, distributing malware, hosting illegal content, or engaging in any activity that disrupts the Service.</p>

            <p><strong className="text-foreground">4. Content Responsibility</strong><br />
            You are solely responsible for any content you publish through the Service. You retain all rights to your content. You represent and warrant that your content does not infringe any third-party rights.</p>

            <p><strong className="text-foreground">5. Termination</strong><br />
            We reserve the right to suspend or terminate access to the Service at any time, without notice, for conduct that we believe violates these Terms or is harmful to other users or the Service.</p>

            <p><strong className="text-foreground">6. Disclaimer of Warranties</strong><br />
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. We do not guarantee that the Service will be uninterrupted, secure, or error-free.</p>

            <p><strong className="text-foreground">7. Limitation of Liability</strong><br />
            In no event shall QLSS be liable for any damages arising out of the use or inability to use the Service.</p>

            <p><strong className="text-foreground">8. Changes to Terms</strong><br />
            We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>

            <p className="text-xs text-muted-foreground/60 pt-4">Last updated: June 2026</p>
          </div>
        </div>
      </div>
    </main>
  );
}
