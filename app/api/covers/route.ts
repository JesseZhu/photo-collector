import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getTokenFromRequest, verifyToken } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const COVERS_DIR = path.join(process.cwd(), 'data', 'covers');

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = getTokenFromRequest(request.headers);
  if (!token) return false;
  return verifyToken(token);
}

export async function POST(request: NextRequest) {
  if (!await isAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    await fs.mkdir(COVERS_DIR, { recursive: true });

    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const filename = `cover-${timestamp}.${ext}`;
    const filePath = path.join(COVERS_DIR, filename);

    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      url: `/api/covers/${filename}`,
    });
  } catch (error: any) {
    console.error('Cover upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
