import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/service";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createMiddlewareClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
    },
  });

  if (!supabase) {
    return response;
  }

  await supabase.auth.getUser();

  return response;
}
