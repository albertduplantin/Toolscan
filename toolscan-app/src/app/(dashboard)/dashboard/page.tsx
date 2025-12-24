import { redirect } from 'next/navigation';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { db } from '@/lib/db';
import { cabinets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ScanLine, Package } from 'lucide-react';

export default async function DashboardPage() {
  const currentUser = await getCurrentDbUser();

  // Layout already ensures user exists and has tenantId
  if (!currentUser) {
    redirect('/onboarding');
  }

  // Get all configured cabinets (not drafts)
  const allCabinets = await db.query.cabinets.findMany({
    where: eq(cabinets.tenantId, currentUser.tenantId!),
    orderBy: (cabinets, { desc }) => [desc(cabinets.createdAt)],
    with: {
      tools: true,
    },
  });

  // Filter only configured cabinets for standard users
  const configuredCabinets = currentUser.role === 'admin' || currentUser.role === 'super_admin'
    ? allCabinets
    : allCabinets.filter(c => c.status !== 'draft');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Sélectionnez une armoire</h1>
        <p className="text-muted-foreground">
          Choisissez l'armoire que vous souhaitez scanner
        </p>
      </div>

      {configuredCabinets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucune armoire disponible</CardTitle>
            <CardDescription>
              {currentUser.role === 'admin' || currentUser.role === 'super_admin'
                ? "Commencez par créer et configurer votre première armoire"
                : "Aucune armoire n'est encore configurée. Contactez un administrateur."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Package className="h-16 w-16 text-muted-foreground" />
              {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                <Link href="/dashboard/cabinets/new">
                  <Button>
                    Créer ma première armoire
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {configuredCabinets.map((cabinet) => (
            <Card key={cabinet.id} className="hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="text-xl">{cabinet.name}</CardTitle>
                {cabinet.description && (
                  <CardDescription className="line-clamp-2">
                    {cabinet.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Outils configurés</span>
                  <Badge variant="outline">{cabinet.tools?.length || 0}</Badge>
                </div>

                {cabinet.status === 'draft' ? (
                  <div className="space-y-2">
                    <Badge variant="secondary">Configuration requise</Badge>
                    {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                      <Link href={`/dashboard/cabinets/${cabinet.id}/configure`}>
                        <Button variant="outline" className="w-full">
                          Configurer
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <Link href={`/dashboard/cabinets/${cabinet.id}/verify`}>
                    <Button className="w-full" size="lg">
                      <ScanLine className="mr-2 h-5 w-5" />
                      Scanner cette armoire
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
