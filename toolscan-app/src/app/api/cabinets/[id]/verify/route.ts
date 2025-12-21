import { NextResponse } from 'next/server';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { db } from '@/lib/db';
import { cabinets, verifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * API route to save verification results
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

    // Get verification data from request body
    const body = await request.json();
    const { imageUrl, missingToolIds, presentToolIds, confidenceScore } = body;

    if (!imageUrl || !Array.isArray(missingToolIds) || !Array.isArray(presentToolIds)) {
      return NextResponse.json(
        { error: 'Invalid verification data' },
        { status: 400 }
      );
    }

    const totalTools = cabinet.tools?.length || 0;
    const missingCount = missingToolIds.length;
    const completionRate = totalTools > 0
      ? ((totalTools - missingCount) / totalTools) * 100
      : 100;

    // Create verification record
    const [verification] = await db
      .insert(verifications)
      .values({
        cabinetId: id,
        verifiedBy: currentUser.id,
        imageUrl,
        resultData: {
          missingTools: missingToolIds,
          presentTools: presentToolIds,
          confidenceScore,
          totalTools,
        },
        missingCount,
        completionRate: completionRate.toFixed(2),
      })
      .returning();

    return NextResponse.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error('Error saving verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET verification history for a cabinet
 */
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

    // Get verification history
    const history = await db.query.verifications.findMany({
      where: eq(verifications.cabinetId, id),
      orderBy: (verifications, { desc }) => [desc(verifications.verifiedAt)],
      with: {
        verifier: {
          columns: {
            id: true,
            email: true,
          },
        },
      },
      limit: 50, // Last 50 verifications
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching verification history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
