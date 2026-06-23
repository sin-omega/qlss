import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiSupabaseGuard } from "@/lib/supabase/guard";

export async function POST(request: NextRequest) {
  const _guard = apiSupabaseGuard();
  if (_guard) return _guard;
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });
}
