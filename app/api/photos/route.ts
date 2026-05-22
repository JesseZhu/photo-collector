import { NextRequest, NextResponse } from 'next/server';
import { getPhotos, deletePhoto } from '@/lib/storage';
import { isEventValid } from '@/lib/events';
import { getTokenFromRequest, verifyToken } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const event = searchParams.get('event');
    const user = searchParams.get('user') || undefined;

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event parameter is required' },
        { status: 400 }
      );
    }

    const { valid, expired } = await isEventValid(event);

    if (!valid) {
      if (expired) {
        const photos = await getPhotos(event, user);
        return NextResponse.json({
          success: true,
          photos,
          expired: true,
        });
      }
      return NextResponse.json(
        { success: false, error: 'Event does not exist' },
        { status: 404 }
      );
    }

    const photos = await getPhotos(event, user);

    return NextResponse.json({
      success: true,
      photos,
    });
  } catch (error) {
    console.error('Get photos error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get photos' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const token = getTokenFromRequest(request.headers);
  if (!token || !verifyToken(token)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const event = searchParams.get('event');
    const user = searchParams.get('user');
    const filename = searchParams.get('filename');

    if (!event || !user || !filename) {
      return NextResponse.json(
        { success: false, error: 'event, user, and filename are required' },
        { status: 400 }
      );
    }

    await deletePhoto(event, user, filename);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
