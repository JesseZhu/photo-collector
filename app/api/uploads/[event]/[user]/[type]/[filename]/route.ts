import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
};

function getRange(rangeHeader: string, fileSize: number): { start: number; end: number } | null {
  const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!match) return null;

  let start = match[1] ? parseInt(match[1], 10) : 0;
  let end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

  if (isNaN(start)) {
    // Suffix range: bytes=-500 → last 500 bytes
    const suffixLength = isNaN(parseInt(match[2], 10)) ? 0 : end + 1;
    if (suffixLength <= 0) return null;
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  }

  if (start >= fileSize || end < start) return null;
  if (end >= fileSize) end = fileSize - 1;

  return { start, end };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ event: string; user: string; type: string; filename: string }> }
) {
  try {
    const { event, user, type, filename } = await params;

    const safeEvent = event.replace(/[/\\]/g, '-');
    const safeUser = user.replace(/[/\\]/g, '-');
    const safeType = ['original', 'thumbnails'].includes(type) ? type : 'original';
    const safeFilename = filename.replace(/[/\\]/g, '-');

    const filePath = path.join(process.cwd(), 'uploads', safeEvent, safeUser, safeType, safeFilename);

    let stat: fs.Stats;
    try {
      stat = await fsp.stat(filePath);
    } catch {
      return new NextResponse('File not found', { status: 404 });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = CONTENT_TYPE_MAP[ext] || 'application/octet-stream';
    const fileSize = stat.size;
    const rangeHeader = request.headers.get('range');

    // Support Range requests for all files (required by Safari for video)
    if (rangeHeader) {
      const range = getRange(rangeHeader, fileSize);
      if (!range) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        });
      }

      const { start, end } = range;
      const chunkSize = end - start + 1;
      const nodeStream = fs.createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': String(chunkSize),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    const nodeStream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
