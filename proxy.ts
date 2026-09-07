import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/session'

// Next 16 renamed the "middleware" file convention to "proxy"; the request and
// response API is otherwise unchanged.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Everything except static assets and image files, which never carry a
    // session and would only pay the refresh cost for nothing. The service
    // worker and manifest are excluded on the same grounds: the browser
    // revalidates both on every load, and neither is ever a signed-in request.
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
