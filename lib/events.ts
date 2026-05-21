import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export interface EventMeta {
  id: string;
  description: string;
  coverImage: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

export interface EventWithStats extends EventMeta {
  photoCount: number;
  userCount: number;
}

async function loadEvents(): Promise<Record<string, EventMeta>> {
  try {
    const content = await fs.readFile(EVENTS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveEvents(events: Record<string, EventMeta>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
}

function checkExpiry(event: EventMeta): EventMeta {
  const now = new Date();
  const expiresAt = new Date(event.expiresAt);

  if (now > expiresAt && event.active) {
    return { ...event, active: false };
  }

  return event;
}

export async function createEvent(
  id: string,
  description: string,
  coverImage: string,
  expiryDays: number = 7
): Promise<EventMeta> {
  const events = await loadEvents();

  if (events[id]) {
    throw new Error('Event already exists');
  }

  const sanitizedId = id.replace(/[/\\]/g, '-').replace(/\.\./g, '').trim().toLowerCase();

  if (!sanitizedId || sanitizedId.length < 3) {
    throw new Error('Event ID must be at least 3 characters');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

  const event: EventMeta = {
    id: sanitizedId,
    description,
    coverImage,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    active: true,
  };

  events[sanitizedId] = event;
  await saveEvents(events);

  const uploadDir = path.join(UPLOAD_DIR, sanitizedId);
  await fs.mkdir(uploadDir, { recursive: true });

  return event;
}

export async function deleteEvent(id: string): Promise<void> {
  const events = await loadEvents();

  if (!events[id]) {
    throw new Error('Event not found');
  }

  delete events[id];
  await saveEvents(events);

  const uploadDir = path.join(UPLOAD_DIR, id);
  try {
    await fs.rm(uploadDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to delete upload directory:', error);
  }
}

export async function isEventValid(id: string): Promise<{ valid: boolean; expired: boolean }> {
  const events = await loadEvents();
  const event = events[id];

  if (!event) {
    return { valid: false, expired: false };
  }

  const updatedEvent = checkExpiry(event);

  if (updatedEvent.active !== event.active) {
    events[id] = updatedEvent;
    await saveEvents(events);
  }

  return {
    valid: updatedEvent.active,
    expired: !updatedEvent.active,
  };
}

export async function getActiveEvents(): Promise<EventWithStats[]> {
  const events = await loadEvents();
  const result: EventWithStats[] = [];

  for (const event of Object.values(events)) {
    const updatedEvent = checkExpiry(event);

    if (updatedEvent.active !== event.active) {
      events[event.id] = updatedEvent;
    }

    const stats = await getEventStats(event.id);
    result.push({ ...updatedEvent, ...stats });
  }

  await saveEvents(events);

  return result
    .filter(e => e.active)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllEvents(): Promise<EventWithStats[]> {
  const events = await loadEvents();
  const result: EventWithStats[] = [];

  for (const event of Object.values(events)) {
    const updatedEvent = checkExpiry(event);

    if (updatedEvent.active !== event.active) {
      events[event.id] = updatedEvent;
    }

    const stats = await getEventStats(event.id);
    result.push({ ...updatedEvent, ...stats });
  }

  await saveEvents(events);

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function getEventStats(eventId: string): Promise<{ photoCount: number; userCount: number }> {
  const eventDir = path.join(UPLOAD_DIR, eventId);

  try {
    const entries = await fs.readdir(eventDir, { withFileTypes: true });
    let photoCount = 0;
    const users = new Set<string>();

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      users.add(entry.name);

      const originalDir = path.join(eventDir, entry.name, 'original');
      try {
        const files = await fs.readdir(originalDir);
        photoCount += files.length;
      } catch {
        // Ignore
      }
    }

    return { photoCount, userCount: users.size };
  } catch {
    return { photoCount: 0, userCount: 0 };
  }
}
