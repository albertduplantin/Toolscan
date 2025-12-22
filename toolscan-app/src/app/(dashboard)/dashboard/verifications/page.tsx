import { redirect } from 'next/navigation';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { db } from '@/lib/db';
import { verifications, cabinets } from '@/lib/db/schema';
import { eq, desc, and, gte, sql, inArray } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Calendar, Eye, Package } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const currentUser = await getCurrentDbUser();

  if (!currentUser || !currentUser.tenantId) {
    redirect('/onboarding');
  }

  const params = await searchParams;
  const period = params.period || 'all';

  // Calculate date filter
  let dateFilter = undefined;
  if (period === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateFilter = gte(verifications.verifiedAt, today);
  } else if (period === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    dateFilter = gte(verifications.verifiedAt, weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    dateFilter = gte(verifications.verifiedAt, monthAgo);
  }

  // Get all cabinets for this tenant first
  const tenantCabinets = await db.query.cabinets.findMany({
    where: eq(cabinets.tenantId, currentUser.tenantId),
    columns: { id: true },
  });

  const cabinetIds = tenantCabinets.map(c => c.id);

  // Get verifications for tenant's cabinets with filter
  const allVerifications = cabinetIds.length > 0
    ? await db.query.verifications.findMany({
        where: dateFilter
          ? and(
              inArray(verifications.cabinetId, cabinetIds),
              dateFilter
            )
          : inArray(verifications.cabinetId, cabinetIds),
        orderBy: [desc(verifications.verifiedAt)],
        with: {
          cabinet: true,
          verifier: {
            columns: {
              id: true,
              email: true,
            },
          },
        },
        limit: 100, // Limit to last 100 verifications
      })
    : [];

  const getStatusBadge = (missingCount: number, totalCount: number) => {
    if (missingCount === 0) {
      return (
        <Badge className="bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Complet
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertCircle className="mr-1 h-3 w-3" />
        {missingCount} manquant{missingCount > 1 ? 's' : ''}
      </Badge>
    );
  };

  // Calculate statistics
  const totalVerifications = allVerifications.length;
  const completeVerifications = allVerifications.filter(v =>
    v.missingCount === 0
  ).length;
  const incompleteVerifications = totalVerifications - completeVerifications;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Historique des vérifications</h1>
        <p className="text-muted-foreground">
          Consultez l'historique de toutes les vérifications d'armoires
        </p>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2">
        <Link href="/dashboard/verifications?period=all">
          <Button variant={period === 'all' ? 'default' : 'outline'} size="sm">
            Tout
          </Button>
        </Link>
        <Link href="/dashboard/verifications?period=today">
          <Button variant={period === 'today' ? 'default' : 'outline'} size="sm">
            Aujourd'hui
          </Button>
        </Link>
        <Link href="/dashboard/verifications?period=week">
          <Button variant={period === 'week' ? 'default' : 'outline'} size="sm">
            Cette semaine
          </Button>
        </Link>
        <Link href="/dashboard/verifications?period=month">
          <Button variant={period === 'month' ? 'default' : 'outline'} size="sm">
            Ce mois
          </Button>
        </Link>
      </div>

      {/* Statistics */}
      {totalVerifications > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVerifications}</div>
              <p className="text-xs text-muted-foreground">Vérifications</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">Complètes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completeVerifications}</div>
              <p className="text-xs text-muted-foreground">
                {totalVerifications > 0
                  ? `${((completeVerifications / totalVerifications) * 100).toFixed(0)}%`
                  : '0%'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-destructive">Incomplètes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{incompleteVerifications}</div>
              <p className="text-xs text-muted-foreground">
                {totalVerifications > 0
                  ? `${((incompleteVerifications / totalVerifications) * 100).toFixed(0)}%`
                  : '0%'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {allVerifications.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucune vérification</CardTitle>
            <CardDescription>
              {period !== 'all'
                ? `Aucune vérification pour cette période`
                : `Aucune vérification n'a encore été effectuée`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {period !== 'all'
                ? 'Essayez une autre période ou scannez une armoire'
                : 'Les vérifications apparaîtront ici une fois que vous aurez scanné vos armoires'}
            </p>
            <Link href="/dashboard">
              <Button className="mt-4">Aller aux armoires</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Vérifications ({allVerifications.length})</CardTitle>
            <CardDescription>
              {period === 'all' && 'Les 100 dernières vérifications effectuées'}
              {period === 'today' && 'Vérifications d\'aujourd\'hui'}
              {period === 'week' && 'Vérifications de cette semaine'}
              {period === 'month' && 'Vérifications de ce mois'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allVerifications.map((verification) => {
                const missingCount = verification.missingCount;
                const completionRateNum = parseFloat(verification.completionRate);
                const totalCount = missingCount > 0 ? Math.round(missingCount / ((100 - completionRateNum) / 100)) : 0;

                return (
                  <div
                    key={verification.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {verification.cabinet?.name || 'Armoire supprimée'}
                          </h3>
                          {getStatusBadge(missingCount, totalCount)}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(verification.verifiedAt)}
                          </span>
                          {verification.verifier && (
                            <span>Par {verification.verifier.email}</span>
                          )}
                          <span>Complétion: {parseFloat(verification.completionRate).toFixed(0)}%</span>
                        </div>
                        {missingCount > 0 && (
                          <p className="mt-2 text-sm text-destructive">
                            {missingCount} outil{missingCount > 1 ? 's' : ''} manquant{missingCount > 1 ? 's' : ''} sur {totalCount}
                          </p>
                        )}
                      </div>
                    </div>

                    {verification.imageUrl && (
                      <Link
                        href={verification.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Voir l'image
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
