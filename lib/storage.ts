import fs from 'fs/promises';
import path from 'path';
import { generateImageThumbnail, generateVideoThumbnail } from './thumbnail';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export interface FileResult {
  success: boolean;
  filename: string;
  originalPath: string;
  thumbnailPath: string;
  size: number;
  type: 'image' | 'video';
  uploadTime: string;
}

export interface PhotoInfo {
  user: string;
  filename: string;
  originalPath: string;
  thumbnailPath: string;
  size: number;
  type: 'image' | 'video';
  uploadTime: string;
}

export interface EventInfo {
  id: string;
  photoCount: number;
  userCount: number;
  createTime: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/avi', 'video/x-msvideo'];
const MAX_FILE_SIZE = 400 * 1024 * 1024; // 400MB

function sanitizeInput(input: string): string {
  // Remove path traversal attempts and special characters
  return input.replace(/[/\\]/g, '-').replace(/\.\./g, '').trim();
}

function getFileType(mimeType: string): 'image' | 'video' | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
  return null;
}

export async function saveFile(
  file: File,
  event: string,
  user: string
): Promise<FileResult> {
  const sanitizedEvent = sanitizeInput(event);
  const sanitizedUser = sanitizeInput(user);

  if (!sanitizedEvent || !sanitizedUser) {
    throw new Error('Invalid event or user name');
  }

  const fileType = getFileType(file.type);
  if (!fileType) {
    throw new Error('Unsupported file type');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 400MB limit');
  }

  // Create directory structure
  const eventDir = path.join(UPLOAD_DIR, sanitizedEvent);
  const userDir = path.join(eventDir, sanitizedUser);
  const originalDir = path.join(userDir, 'original');
  const thumbnailDir = path.join(userDir, 'thumbnails');

  await fs.mkdir(originalDir, { recursive: true });
  await fs.mkdir(thumbnailDir, { recursive: true });

  // Generate safe filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(file.name) || getFileExtension(file.type);
  const safeFilename = `${timestamp}_${randomStr}${ext}`;

  const originalPath = path.join(originalDir, safeFilename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(originalPath, buffer);

  // Generate thumbnail
  const thumbnailFilename = `${path.basename(safeFilename, ext)}_thumb.jpg`;
  const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

  try {
    if (fileType === 'image') {
      await generateImageThumbnail(originalPath, thumbnailPath);
    } else if (fileType === 'video') {
      await generateVideoThumbnail(originalPath, thumbnailPath);
    }
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    // Continue even if thumbnail fails
  }

  return {
    success: true,
    filename: safeFilename,
    originalPath: `/api/uploads/${sanitizedEvent}/${sanitizedUser}/original/${safeFilename}`,
    thumbnailPath: `/api/uploads/${sanitizedEvent}/${sanitizedUser}/thumbnails/${thumbnailFilename}`,
    size: file.size,
    type: fileType,
    uploadTime: new Date().toISOString(),
  };
}

export async function getPhotos(event: string, user?: string): Promise<PhotoInfo[]> {
  const sanitizedEvent = sanitizeInput(event);
  const eventDir = path.join(UPLOAD_DIR, sanitizedEvent);

  try {
    const users = await fs.readdir(eventDir, { withFileTypes: true });
    const photos: PhotoInfo[] = [];

    for (const userEntry of users) {
      if (!userEntry.isDirectory()) continue;
      if (user && userEntry.name !== sanitizeInput(user)) continue;

      const userDir = path.join(eventDir, userEntry.name);
      const originalDir = path.join(userDir, 'original');
      const thumbnailDir = path.join(userDir, 'thumbnails');

      try {
        const files = await fs.readdir(originalDir);

        for (const file of files) {
          const originalPath = `/api/uploads/${sanitizedEvent}/${userEntry.name}/original/${file}`;
          const ext = path.extname(file);
          const baseName = path.basename(file, ext);
          const thumbnailFile = `${baseName}_thumb.jpg`;
          const thumbnailPath = `/api/uploads/${sanitizedEvent}/${userEntry.name}/thumbnails/${thumbnailFile}`;

          const stats = await fs.stat(path.join(originalDir, file));
          const fileType = getFileTypeFromExtension(ext);

          photos.push({
            user: userEntry.name,
            filename: file,
            originalPath,
            thumbnailPath,
            size: stats.size,
            type: fileType,
            uploadTime: stats.birthtime.toISOString(),
          });
        }
      } catch (error) {
        console.error(`Error reading user directory ${userEntry.name}:`, error);
      }
    }

    // Sort by upload time (newest first)
    return photos.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime());
  } catch (error) {
    console.error('Error reading event directory:', error);
    return [];
  }
}

export async function getEvents(): Promise<EventInfo[]> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });
    const events: EventInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const eventDir = path.join(UPLOAD_DIR, entry.name);
      let photoCount = 0;
      const users = new Set<string>();

      try {
        const usersList = await fs.readdir(eventDir, { withFileTypes: true });

        for (const userEntry of usersList) {
          if (!userEntry.isDirectory()) continue;
          users.add(userEntry.name);

          const originalDir = path.join(eventDir, userEntry.name, 'original');
          try {
            const files = await fs.readdir(originalDir);
            photoCount += files.length;
          } catch {
            // Ignore errors
          }
        }
      } catch {
        // Ignore errors
      }

      const stats = await fs.stat(eventDir);
      events.push({
        id: entry.name,
        photoCount,
        userCount: users.size,
        createTime: stats.birthtime.toISOString(),
      });
    }

    return events.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  } catch (error) {
    console.error('Error reading events:', error);
    return [];
  }
}

function getFileExtension(mimeType: string): string {
  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/avi': '.avi',
  };
  return extMap[mimeType] || '.jpg';
}

export async function deletePhoto(event: string, user: string, filename: string): Promise<void> {
  const sanitizedEvent = sanitizeInput(event);
  const sanitizedUser = sanitizeInput(user);
  const safeFilename = filename.replace(/[/\\]/g, '').trim();

  if (!sanitizedEvent || !sanitizedUser || !safeFilename) {
    throw new Error('Invalid parameters');
  }

  const baseDir = path.join(UPLOAD_DIR, sanitizedEvent, sanitizedUser);
  const ext = path.extname(safeFilename);
  const baseName = path.basename(safeFilename, ext);
  const originalFile = path.join(baseDir, 'original', safeFilename);
  const thumbnailFile = path.join(baseDir, 'thumbnails', `${baseName}_thumb.jpg`);

  let deletedCount = 0;
  try {
    await fs.unlink(originalFile);
    deletedCount++;
  } catch { /* file may not exist */ }

  try {
    await fs.unlink(thumbnailFile);
    deletedCount++;
  } catch { /* file may not exist */ }

  if (deletedCount === 0) {
    throw new Error('Photo not found');
  }
}

function getFileTypeFromExtension(ext: string): 'image' | 'video' {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
  const videoExts = ['.mp4', '.mov', '.avi'];

  if (imageExts.includes(ext.toLowerCase())) return 'image';
  if (videoExts.includes(ext.toLowerCase())) return 'video';
  return 'image'; // Default to image
}
