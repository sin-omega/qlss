import { ShortenerForm } from "@/components/qlss/shortener-form";

export const dynamic = "force-dynamic";

export default function DashboardShortenerPage() {
  return (
    <section className="px-6 py-10 md:py-16">
      <div className="mx-auto max-w-xl">
        <h1 className="text-lg font-bold tracking-tight mb-2">
          Shorten a link
        </h1>
        <p className="text-xs text-muted-foreground mb-8 leading-relaxed">
          Paste any URL below. You&apos;re signed in, so you can use a custom
          alias and the link will be saved to your account.
        </p>

        <ShortenerForm />
      </div>
    </section>
  );
}
