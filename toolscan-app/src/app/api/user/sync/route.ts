import { auth } from '@clerk/nextjs/server';
import { syncUserFromClerk } from '@/lib/clerk/utils';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sync user from Clerk
    const user = await syncUserFromClerk(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to sync user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
