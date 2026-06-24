import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import { normalizeSlug, isReservedSlug } from "@/lib/slug";
import { SiteHeader } from "@/components/qlss/site-header";
import { MarkdownEditor } from "@/components/qlss/markdown-editor";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EditMarkdownPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);

  if (!isSupabaseConfigured()) {
    redirect("/?error=auth_not_configured");
  }

  if (isReservedSlug(slug)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const service = createServiceClient();
  const { data: link } = await service
    .from("links")
    .select("id, user_id, link_type, markdown_content, og_title, og_description, og_image, pincode, use_count, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!link) {
    notFound();
  }

  if (link.link_type !== "markdown") {
    // Only markdown pages are editable here
    redirect(`/${slug}`);
  }

  if (link.user_id !== user.id) {
    // Not the owner
    redirect(`/${slug}`);
  }

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <SiteHeader signedIn={true} />
      <div className="header-accent-line" />

      <section className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-6 sm:pt-10 pb-20">
        <div className="w-full max-w-xl animate-page-enter">
          <p className="text-[11px] text-muted-foreground mb-1 tracking-wide">
            <span className="text-foreground">$</span> qlss --edit /{slug}
          </p>
          <h1 className="text-base font-bold tracking-tight mb-4">
            {t("markdown.edit_title")}
          </h1>
          <MarkdownEditor
            slug={slug}
            initial={{
              markdown_content: link.markdown_content ?? "",
              og_title: link.og_title ?? "",
              og_description: link.og_description ?? "",
              og_image: link.og_image ?? "",
              pincode: link.pincode ?? "",
            }}
            lastEdited={link.updated_at}
            stats={{
              use_count: link.use_count ?? 0,
              created_at: link.created_at ?? "",
            }}
          />
        </div>
      </section>
    </main>
  );
}
