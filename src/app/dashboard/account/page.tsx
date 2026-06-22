import { createClient } from "@/lib/supabase/server";
import { ChangeUsernameForm } from "@/components/qlss/change-username";
import { EditDescriptionForm } from "@/components/qlss/edit-description";
import { LinkedAccounts } from "@/components/qlss/linked-accounts";
import { DeleteAccountSection } from "@/components/qlss/delete-account";

export const dynamic = "force-dynamic";

export default async function DashboardAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The dashboard layout guarantees `user` is non-null (it redirects to
  // /auth otherwise), but TypeScript can't infer that across page
  // boundaries. Guard defensively.
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, description, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const providers = (user.identities ?? [])
    .map((i) => i.provider ?? "")
    .filter(Boolean);

  return (
    <section className="px-6 py-10 md:py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Account</h1>
        </div>

        {/* Change username */}
        <ChangeUsernameForm currentUsername={profile?.username ?? ""} />

        {/* Edit description / bio */}
        <EditDescriptionForm
          currentDescription={profile?.description ?? ""}
        />

        {/* Linked sign-in methods */}
        <LinkedAccounts initialProviders={providers} />

        {/* Danger zone */}
        <DeleteAccountSection username={profile?.username ?? ""} />
      </div>
    </section>
  );
}
