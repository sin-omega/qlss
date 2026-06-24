import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ signedIn: false });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return NextResponse.json({ signedIn: !!user });
}
