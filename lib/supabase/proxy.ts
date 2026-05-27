import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // Auth is deferred — catalog, product list, and cart are PUBLIC. We only
  // gate the steps that need a user identity: questions (to attribute the
  // submitted quote) and history (to fetch their own past quotes).
  const isProtected =
    pathname === "/quote/questions" ||
    pathname.startsWith("/quote/history");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    // If `next` is set and is a relative path, send the user there so the
    // post-login destination survives the race where the proxy fires before
    // cookies have fully propagated (and we end up here as a bounce-back).
    const requestedNext = request.nextUrl.searchParams.get("next");
    const safeNext =
      requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
        ? requestedNext
        : "/quote";

    const url = request.nextUrl.clone();
    url.pathname = safeNext;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
