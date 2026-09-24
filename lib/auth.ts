import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'neuronknowledge_imc_secure_jwt_secret_key_2026_enterprise'
);

export const COOKIE_NAME = 'auth_token';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UserRecord extends AuthUser {
  password_hash?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hash a plain password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a plain password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign a JWT token containing user identity and role
 */
export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id || !payload.email || !payload.role) {
      return null;
    }
    return {
      id: Number(payload.id),
      name: String(payload.name || ''),
      email: String(payload.email),
      role: (payload.role === 'admin' ? 'admin' : 'user') as UserRole,
    };
  } catch {
    return null;
  }
}

/**
 * Get current session from Next.js request cookies (Server Component / Route Handler)
 */
export async function getSession(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(COOKIE_NAME);
    if (!tokenCookie?.value) {
      return null;
    }
    return await verifyToken(tokenCookie.value);
  } catch {
    return null;
  }
}

/**
 * Store the JWT in an HTTP-only secure cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * Remove session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
