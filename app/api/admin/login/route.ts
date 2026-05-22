import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, initializeAdmin, loadAdminData, getTokenFromRequest, verifyToken } from '@/lib/admin';

function setAuthCookie(response: NextResponse, token: string, request: NextRequest) {
  const isSecure = request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https://');
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, initialize } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const adminData = await loadAdminData();

    if (initialize && !adminData.passwordHash) {
      await initializeAdmin(password);
      const token = await verifyPassword(password);

      const response = NextResponse.json({
        success: true,
        message: 'Admin password set successfully',
        token,
      });

      setAuthCookie(response, token, request);

      return response;
    }

    const token = await verifyPassword(password);

    const response = NextResponse.json({
      success: true,
      token,
    });

    setAuthCookie(response, token, request);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Login failed' },
      { status: 401 }
    );
  }
}

export async function GET(request: NextRequest) {
  const adminData = await loadAdminData();
  const token = getTokenFromRequest(request.headers);
  const authenticated = token ? verifyToken(token) : false;
  return NextResponse.json({
    initialized: !!adminData.passwordHash,
    authenticated,
  });
}
