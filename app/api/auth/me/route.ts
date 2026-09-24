import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Refresh from database to ensure up-to-date role and status
    const result = await query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1 LIMIT 1',
      [session.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = result.rows[0];

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Check session error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
