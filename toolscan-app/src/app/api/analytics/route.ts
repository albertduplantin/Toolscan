import { NextResponse } from 'next/server';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { db } from '@/lib/db';
import { cabinets, verifications } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const currentUser = await getCurrentDbUser();

    if (!currentUser || !currentUser.tenantId) {
      return NextResponse.json(
        { error: 'User not authenticated or no tenant' },
        { status: 401 }
      );
    }

    // Get all cabinets for this tenant
    const allCabinets = await db.query.cabinets.findMany({
      where: eq(cabinets.tenantId, currentUser.tenantId),
      with: {
        tools: true,
        verifications: {
          orderBy: (verifications, { desc }) => [desc(verifications.verifiedAt)],
          limit: 1,
        },
      },
    });

    // Get all verifications for this tenant's cabinets
    const cabinetIds = allCabinets.map(c => c.id);

    const allVerifications = cabinetIds.length > 0
      ? await db.query.verifications.findMany({
          where: sql`${verifications.cabinetId} IN ${cabinetIds}`,
          orderBy: (verifications, { desc }) => [desc(verifications.verifiedAt)],
          with: {
            cabinet: {
              columns: {
                id: true,
                name: true,
              },
            },
            verifier: {
              columns: {
                email: true,
              },
            },
          },
          limit: 100,
        })
      : [];

    // Calculate overview stats
    const totalCabinets = allCabinets.length;
    const totalVerifications = allVerifications.length;

    const averageCompletionRate =
      allVerifications.length > 0
        ? allVerifications.reduce((sum, v) => sum + parseFloat(v.completionRate), 0) /
          allVerifications.length
        : 0;

    const totalMissingTools = allVerifications.length > 0
      ? allVerifications[0]?.missingCount || 0
      : 0;

    // Calculate trends
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const lastWeekVerifications = allVerifications.filter(
      v => new Date(v.verifiedAt) >= oneWeekAgo
    ).length;

    const lastMonthVerifications = allVerifications.filter(
      v => new Date(v.verifiedAt) >= oneMonthAgo
    ).length;

    // Cabinet statistics
    const cabinetStats = allCabinets.map(cabinet => {
      const cabinetVerifications = allVerifications.filter(
        v => v.cabinetId === cabinet.id
      );

      const avgCompletionRate =
        cabinetVerifications.length > 0
          ? cabinetVerifications.reduce((sum, v) => sum + parseFloat(v.completionRate), 0) /
            cabinetVerifications.length
          : 0;

      const lastVerification = cabinetVerifications[0];

      return {
        cabinetId: cabinet.id,
        cabinetName: cabinet.name,
        verificationsCount: cabinetVerifications.length,
        averageCompletionRate: avgCompletionRate,
        lastVerifiedAt: lastVerification?.verifiedAt || null,
      };
    });

    // Recent verifications (last 10)
    const recentVerifications = allVerifications.slice(0, 10).map(v => ({
      id: v.id,
      cabinetName: v.cabinet.name,
      cabinetId: v.cabinetId,
      missingCount: v.missingCount,
      completionRate: v.completionRate,
      verifiedAt: v.verifiedAt,
      verifierEmail: v.verifier.email,
    }));

    const analyticsData = {
      overview: {
        totalCabinets,
        totalVerifications,
        averageCompletionRate,
        totalMissingTools,
      },
      trends: {
        lastWeek: lastWeekVerifications,
        lastMonth: lastMonthVerifications,
        trend: 'stable' as const,
      },
      cabinetStats: cabinetStats.sort((a, b) => b.verificationsCount - a.verificationsCount),
      recentVerifications,
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
