import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;

export async function generateImageThumbnail(
  inputPath: string,
  outputPath: string
): Promise<void> {
  try {
    await sharp(inputPath)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80, progressive: true })
      .toFile(outputPath);
  } catch (error) {
    console.error('Image thumbnail generation failed:', error);
    throw error;
  }
}

export async function generateVideoThumbnail(
  inputPath: string,
  outputPath: string
): Promise<void> {
  try {
    // Extract first frame using ffmpeg
    const command = `ffmpeg -i "${inputPath}" -vf "thumbnail,scale=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:force_original_aspect_ratio=increase" -frames:v 1 -y "${outputPath}"`;
    await execAsync(command);
  } catch (error) {
    console.error('Video thumbnail generation failed:', error);
    // Fallback: create a placeholder thumbnail
    await sharp({
      create: {
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        channels: 3,
        background: { r: 50, g: 50, b: 50 },
      },
    })
      .jpeg()
      .toFile(outputPath);
  }
}
