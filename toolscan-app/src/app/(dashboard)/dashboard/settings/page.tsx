import { redirect } from 'next/navigation';
import { getCurrentDbUser, isAdmin } from '@/lib/clerk/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Building2, CreditCard, Settings as SettingsIcon } from 'lucide-react';

export default async function SettingsPage() {
  const user = await getCurrentDbUser();
  const userIsAdmin = await isAdmin();

  if (!user) {
    redirect('/sign-in');
  }

  const settings = [
    {
      title: 'Organisation',
      description: 'Gérez les informations de votre organisation',
      icon: Building2,
      href: '/dashboard/settings/organization',
      adminOnly: true,
    },
    {
      title: 'Équipe',
      description: 'Invitez et gérez les membres de votre équipe',
      icon: Users,
      href: '/dashboard/settings/team',
      adminOnly: true,
    },
    {
      title: 'Abonnement',
      description: 'Gérez votre abonnement et facturation',
      icon: CreditCard,
      href: '/dashboard/settings/billing',
      adminOnly: true,
    },
    {
      title: 'Préférences',
      description: 'Configurez vos préférences personnelles',
      icon: SettingsIcon,
      href: '/dashboard/settings/preferences',
      adminOnly: false,
    },
  ];

  const visibleSettings = settings.filter((s) => !s.adminOnly || userIsAdmin);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et de votre organisation
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleSettings.map((setting) => (
          <Card key={setting.href} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <setting.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{setting.title}</CardTitle>
                    <CardDescription>{setting.description}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={setting.href}>
                <Button variant="outline" className="w-full">
                  Gérer
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {user.tenant && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de l'organisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Nom</span>
              <span className="text-sm font-medium">{user.tenant.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Identifiant</span>
              <span className="text-sm font-mono">{user.tenant.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-medium capitalize">
                {user.tenant.subscriptionTier}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Votre rôle</span>
              <span className="text-sm font-medium capitalize">{user.role}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
