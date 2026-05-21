import { NextRequest, NextResponse } from 'next/server';
import { createEvent, deleteEvent, getAllEvents, getActiveEvents } from '@/lib/events';
import { getTokenFromRequest, verifyToken } from '@/lib/admin';

function isAuthenticated(request: NextRequest): boolean {
  const token = getTokenFromRequest(request.headers);
  if (!token) return false;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get('admin') === 'true';

    if (admin && !isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const events = admin ? await getAllEvents() : await getActiveEvents();

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, description = '', coverImage = '', expiryDays = 7 } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const validExpiryDays = [1, 3, 7, 14, 30];
    const expiry = validExpiryDays.includes(expiryDays) ? expiryDays : 7;

    const event = await createEvent(id, description, coverImage, expiry);

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create event' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    await deleteEvent(id);

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete event' },
      { status: 400 }
    );
  }
}
