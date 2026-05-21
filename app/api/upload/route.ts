import { NextRequest, NextResponse } from 'next/server';
import { saveFile } from '@/lib/storage';
import { isEventValid } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const event = formData.get('event') as string;
    const user = formData.get('user') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'No event provided' },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No user provided' },
        { status: 400 }
      );
    }

    const { valid, expired } = await isEventValid(event);

    if (!valid) {
      if (expired) {
        return NextResponse.json(
          { success: false, error: 'Event has expired' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Event does not exist' },
        { status: 404 }
      );
    }

    const result = await saveFile(file, event, user);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Upload error:', error);

    if (error.message.includes('File size')) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 200MB limit' },
        { status: 400 }
      );
    }

    if (error.message.includes('Unsupported file type')) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Only images and videos are allowed.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
