import { NextResponse } from 'next/server';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { db } from '@/lib/db';
import { cabinets, tools } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * API route to trigger silhouette detection
 *
 * This endpoint will be called after both images are uploaded.
 * For now, it creates placeholder tools based on the detection algorithm.
 * The actual detection will run client-side using the silhouette-detector utility.
 */
export async function POST(
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

    // Verify cabinet belongs to tenant
    const cabinet = await db.query.cabinets.findFirst({
      where: and(
        eq(cabinets.id, id),
        eq(cabinets.tenantId, currentUser.tenantId)
      ),
    });

    if (!cabinet) {
      return NextResponse.json(
        { error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    if (!cabinet.emptyImageUrl || !cabinet.fullImageUrl) {
      return NextResponse.json(
        { error: 'Both images are required for detection' },
        { status: 400 }
      );
    }

    // Get silhouette data from request body
    const body = await request.json();
    const { silhouettes } = body;

    if (!silhouettes || !Array.isArray(silhouettes)) {
      return NextResponse.json(
        { error: 'Invalid silhouettes data' },
        { status: 400 }
      );
    }

    // Delete existing tools for this cabinet
    await db.delete(tools).where(eq(tools.cabinetId, id));

    // Create tools from detected silhouettes
    const createdTools = [];
    for (let i = 0; i < silhouettes.length; i++) {
      const sil = silhouettes[i];
      const [tool] = await db
        .insert(tools)
        .values({
          cabinetId: id,
          name: `Outil ${i + 1}`,
          description: `Détecté automatiquement - Surface: ${sil.area} pixels`,
          silhouetteData: sil,
          positionData: {
            x: sil.x,
            y: sil.y,
            width: sil.width,
            height: sil.height,
          },
        })
        .returning();

      createdTools.push(tool);
    }

    // Update cabinet status to active
    await db
      .update(cabinets)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(cabinets.id, id));

    return NextResponse.json({
      success: true,
      toolsCount: createdTools.length,
      tools: createdTools,
    });
  } catch (error) {
    console.error('Error detecting silhouettes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
