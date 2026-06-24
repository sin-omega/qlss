import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <div className="flex-1 flex flex-col items-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← back to QLSS
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-6">Privacy Policy</h1>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p><strong className="text-foreground">1. Information We Collect</strong><br />
            We collect information you provide when creating an account or using the Service, including email address (if you sign in), content you publish, and analytics data such as IP address, user agent, and referrer.</p>

            <p><strong className="text-foreground">2. How We Use Information</strong><br />
            We use collected information to operate, maintain, and improve the Service, to track link analytics, and to communicate with you regarding your account.</p>

            <p><strong className="text-foreground">3. Data Storage</strong><br />
            Your data is stored on Supabase infrastructure. We retain your data for as long as your account is active or as needed to provide the Service.</p>

            <p><strong className="text-foreground">4. Data Sharing</strong><br />
            We do not sell your personal information. We may share data with service providers (e.g., Supabase) who assist in operating the Service, and as required by law.</p>

            <p><strong className="text-foreground">5. Cookies</strong><br />
            We use essential cookies for authentication and session management. We also use a cookie for theme preference. Third-party services may set their own cookies.</p>

            <p><strong className="text-foreground">6. Your Rights</strong><br />
            You may request access to, correction of, or deletion of your personal data by contacting us. You may also delete your content at any time through the Service.</p>

            <p><strong className="text-foreground">7. Security</strong><br />
            We implement reasonable security measures to protect your data, but no method of transmission or storage is 100% secure.</p>

            <p><strong className="text-foreground">8. Changes to This Policy</strong><br />
            We may update this Privacy Policy. Material changes will be notified via the Service.</p>

            <p className="text-xs text-muted-foreground/60 pt-4">Last updated: June 2026</p>
          </div>
        </div>
      </div>
    </main>
  );
}
