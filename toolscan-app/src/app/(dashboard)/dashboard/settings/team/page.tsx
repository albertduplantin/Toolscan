import { redirect } from 'next/navigation';
import { getCurrentDbUser, isAdmin } from '@/lib/clerk/utils';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

export default async function TeamPage() {
  const currentUser = await getCurrentDbUser();
  const userIsAdmin = await isAdmin();

  if (!currentUser || !currentUser.tenantId) {
    redirect('/onboarding');
  }

  if (!userIsAdmin) {
    redirect('/dashboard/settings');
  }

  // Get all team members
  const teamMembers = await db.query.users.findMany({
    where: eq(users.tenantId, currentUser.tenantId),
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  });

  const getRoleBadge = (role: string) => {
    const variants = {
      super_admin: 'destructive',
      admin: 'default',
      user: 'secondary',
    } as const;

    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      user: 'Utilisateur',
    } as const;

    return (
      <Badge variant={variants[role as keyof typeof variants] || 'secondary'}>
        {labels[role as keyof typeof labels] || role}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Gestion de l'équipe</h1>
        <p className="text-muted-foreground">
          Gérez les membres de votre organisation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membres de l'équipe ({teamMembers.length})</CardTitle>
          <CardDescription>
            Liste de tous les utilisateurs de votre organisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Date d'ajout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Aucun membre dans l'équipe
                  </TableCell>
                </TableRow>
              ) : (
                teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.email}
                      {member.id === currentUser.id && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Vous)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(member.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inviter des membres</CardTitle>
          <CardDescription>
            Fonctionnalité à venir : Invitez des utilisateurs à rejoindre votre
            organisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pour le moment, les utilisateurs doivent créer un compte et un
            administrateur doit les ajouter manuellement à votre organisation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
