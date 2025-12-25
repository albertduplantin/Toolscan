import { redirect } from 'next/navigation';
import { getCurrentDbUser, isAdmin } from '@/lib/clerk/utils';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantInvitations } from '@/lib/actions/invitations';
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
import { InviteByEmailButton } from '@/components/team/invite-by-email-button';
import { CreateInviteLinkButton } from '@/components/team/create-invite-link-button';
import { InvitationsList } from '@/components/team/invitations-list';
import { UserActions } from '@/components/team/user-actions';

export default async function TeamPage() {
  const currentUser = await getCurrentDbUser();
  const userIsAdmin = await isAdmin();

  if (!currentUser || !currentUser.tenantId) {
    redirect('/onboarding');
  }

  if (!userIsAdmin) {
    redirect('/dashboard/settings');
  }

  const tenantId = currentUser.tenantId;

  // Get all team members
  const teamMembers = await db.query.users.findMany({
    where: eq(users.tenantId, tenantId),
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  });

  // Get all invitations
  const invitationsList = await getTenantInvitations();

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

      {/* Team Members */}
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
                <TableHead>Téléphone</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Date d'ajout</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                    <TableCell className="text-muted-foreground">
                      {member.phoneNumber || '-'}
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(member.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.id !== currentUser.id && member.role !== 'super_admin' && (
                        <UserActions
                          userId={member.id}
                          userEmail={member.email}
                          currentRole={member.role}
                          currentPhoneNumber={member.phoneNumber}
                          isCurrentUser={member.id === currentUser.id}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Members */}
      <Card>
        <CardHeader>
          <CardTitle>Inviter des membres</CardTitle>
          <CardDescription>
            Deux moyens pour inviter des utilisateurs à rejoindre votre organisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-semibold mb-3">Comment inviter des membres ?</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Invitation par email</p>
                  <p className="text-muted-foreground">
                    Un email est envoyé avec un lien d'invitation. Le destinataire clique sur le lien et créé son compte.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Code d'invitation (5 lettres)</p>
                  <p className="text-muted-foreground">
                    Partagez le code à 5 lettres. L'utilisateur va sur la page d'inscription, clique sur "Rejoindre une équipe" et entre le code.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <InviteByEmailButton />
            <CreateInviteLinkButton />
          </div>
        </CardContent>
      </Card>

      {/* Invitations List */}
      <InvitationsList invitations={invitationsList} />
    </div>
  );
}
