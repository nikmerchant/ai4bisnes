import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Landing page: tangkap kod rujukan affiliate, tiada semakan auth di sini
  if (request.nextUrl.pathname === "/") {
    const ref = request.nextUrl.searchParams.get("ref")?.slice(0, 32);
    if (ref) {
      response.cookies.set("ai4b_ref", ref, {
        maxAge: 60 * 60 * 24 * 30, // 30 hari
        path: "/",
        httpOnly: true,
      });
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/masuk", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/app/:path*", "/onboarding", "/naik-taraf", "/set-kata-laluan"],
};
