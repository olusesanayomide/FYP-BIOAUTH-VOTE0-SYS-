import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Protect the dashboard route
    if (pathname.startsWith('/h3xG9Lz_admin/dashboard')) {
        const hasAdminSession = req.cookies.has('admin_token');

        // As per user request: Even if someone discovers the URL, they should NOT see anything without auth.
        if (!hasAdminSession) {
            req.nextUrl.pathname = '/404';
            return NextResponse.rewrite(req.nextUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/h3xG9Lz_admin/dashboard/:path*'],
};
