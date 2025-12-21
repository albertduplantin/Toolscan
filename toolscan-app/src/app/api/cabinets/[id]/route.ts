import { NextResponse } from 'next/server';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { db } from '@/lib/db';
import { cabinets } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentDbUser();

    if (!currentUser || !currentUser.tenantId) {
      return NextResponse.json(
        { error: 'User not authenticated or no tenant' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const cabinet = await db.query.cabinets.findFirst({
      where: and(
        eq(cabinets.id, id),
        eq(cabinets.tenantId, currentUser.tenantId)
      ),
      with: {
        tools: true,
      },
    });

    if (!cabinet) {
      return NextResponse.json(
        { error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // Map positionData to position for frontend compatibility
    const cabinetWithMappedTools = {
      ...cabinet,
      tools: cabinet.tools?.map(tool => ({
        ...tool,
        position: tool.positionData,
      })),
    };

    return NextResponse.json(cabinetWithMappedTools);
  } catch (error) {
    console.error('Error fetching cabinet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentDbUser();

    if (!currentUser || !currentUser.tenantId) {
      return NextResponse.json(
        { error: 'User not authenticated or no tenant' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verify cabinet belongs to tenant
    const existing = await db.query.cabinets.findFirst({
      where: and(
        eq(cabinets.id, id),
        eq(cabinets.tenantId, currentUser.tenantId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    // Update cabinet
    const [updated] = await db
      .update(cabinets)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(cabinets.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating cabinet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
