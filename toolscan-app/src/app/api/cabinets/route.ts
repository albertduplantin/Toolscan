import { NextResponse } from 'next/server';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { db } from '@/lib/db';
import { cabinets } from '@/lib/db/schema';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentDbUser();

    if (!currentUser || !currentUser.tenantId) {
      return NextResponse.json(
        { error: 'User not authenticated or no tenant' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create cabinet
    const [cabinet] = await db
      .insert(cabinets)
      .values({
        tenantId: currentUser.tenantId,
        name,
        description: description || null,
        status: 'draft',
        createdBy: currentUser.id,
      })
      .returning();

    return NextResponse.json(cabinet);
  } catch (error) {
    console.error('Error creating cabinet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentDbUser();

    if (!currentUser || !currentUser.tenantId) {
      return NextResponse.json(
        { error: 'User not authenticated or no tenant' },
        { status: 401 }
      );
    }

    const allCabinets = await db.query.cabinets.findMany({
      where: (cabinets, { eq }) => eq(cabinets.tenantId, currentUser.tenantId),
      orderBy: (cabinets, { desc }) => [desc(cabinets.createdAt)],
      with: {
        tools: true,
      },
    });

    // Map positionData to position for frontend compatibility
    const cabinetsWithMappedTools = allCabinets.map(cabinet => ({
      ...cabinet,
      tools: cabinet.tools?.map(tool => ({
        ...tool,
        position: tool.positionData,
      })),
    }));

    return NextResponse.json(cabinetsWithMappedTools);
  } catch (error) {
    console.error('Error fetching cabinets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
