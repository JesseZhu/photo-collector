import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, initializeAdmin, loadAdminData } from '@/lib/admin';

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

      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    const token = await verifyPassword(password);

    const response = NextResponse.json({
      success: true,
      token,
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Login failed' },
      { status: 401 }
    );
  }
}

export async function GET() {
  const adminData = await loadAdminData();
  return NextResponse.json({
    initialized: !!adminData.passwordHash,
  });
}
