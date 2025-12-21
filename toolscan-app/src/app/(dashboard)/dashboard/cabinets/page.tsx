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
import { Plus, Package, Settings as SettingsIcon } from 'lucide-react';

export default async function CabinetsPage() {
  const currentUser = await getCurrentDbUser();

  if (!currentUser || !currentUser.tenantId) {
    redirect('/onboarding');
  }

  // Get all cabinets for this tenant
  const allCabinets = await db.query.cabinets.findMany({
    where: eq(cabinets.tenantId, currentUser.tenantId),
    orderBy: (cabinets, { desc }) => [desc(cabinets.createdAt)],
    with: {
      tools: true,
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      configured: 'outline',
      active: 'default',
      archived: 'destructive',
    } as const;

    const labels = {
      draft: 'Brouillon',
      configured: 'Configurée',
      active: 'Active',
      archived: 'Archivée',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Armoires d'outillage</h1>
          <p className="text-muted-foreground">
            Gérez vos armoires et configurez la détection d'outils
          </p>
        </div>
        <Link href="/dashboard/cabinets/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle armoire
          </Button>
        </Link>
      </div>

      {allCabinets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucune armoire</CardTitle>
            <CardDescription>
              Commencez par créer votre première armoire d'outillage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Package className="h-16 w-16 text-muted-foreground" />
              <p className="text-center text-sm text-muted-foreground">
                Créez une armoire, uploadez des photos et configurez la détection
                automatique des outils manquants.
              </p>
              <Link href="/dashboard/cabinets/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer ma première armoire
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allCabinets.map((cabinet) => (
            <Card key={cabinet.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{cabinet.name}</CardTitle>
                    {cabinet.description && (
                      <CardDescription className="line-clamp-2">
                        {cabinet.description}
                      </CardDescription>
                    )}
                  </div>
                  {getStatusBadge(cabinet.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Outils configurés</span>
                  <span className="font-medium">{cabinet.tools?.length || 0}</span>
                </div>

                <div className="flex gap-2">
                  {cabinet.status === 'draft' ? (
                    <Link href={`/dashboard/cabinets/${cabinet.id}/configure`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        Configurer
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href={`/dashboard/cabinets/${cabinet.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          Voir
                        </Button>
                      </Link>
                      <Link href={`/dashboard/cabinets/${cabinet.id}/verify`} className="flex-1">
                        <Button className="w-full">Vérifier</Button>
                      </Link>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
