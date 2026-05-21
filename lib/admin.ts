import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

const JWT_SECRET = process.env.JWT_SECRET || 'photo-collector-default-secret';
const SALT_ROUNDS = 10;

interface AdminData {
  passwordHash: string;
}

export async function loadAdminData(): Promise<Partial<AdminData>> {
  try {
    const content = await fs.readFile(ADMIN_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveAdminData(data: AdminData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ADMIN_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function initializeAdmin(password: string): Promise<void> {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  await saveAdminData({ passwordHash: hash });
}

export async function verifyPassword(password: string): Promise<string> {
  const adminData = await loadAdminData();

  if (!adminData.passwordHash) {
    throw new Error('Admin password not set. Please set ADMIN_PASSWORD environment variable.');
  }

  const isValid = await bcrypt.compare(password, adminData.passwordHash);
  if (!isValid) {
    throw new Error('Invalid password');
  }

  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export function getTokenFromRequest(headers: Headers): string | null {
  const authHeader = headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token && token !== 'null') {
      return token;
    }
  }

  const cookieHeader = headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/admin_token=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}
