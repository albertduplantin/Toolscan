'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import { revokeInvitation, deleteInvitation } from '@/lib/actions/invitations';
import { useRouter } from 'next/navigation';
import { Copy, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { Invitation } from '@/lib/db/schema';

interface InvitationsListProps {
  invitations: (Invitation & {
    inviter: { id: string; email: string } | null;
    accepter: { id: string; email: string } | null;
  })[];
}

export function InvitationsList({ invitations }: InvitationsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cette invitation ?')) return;

    setLoading(invitationId);
    try {
      await revokeInvitation(invitationId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (invitationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette invitation ?')) return;

    setLoading(invitationId);
    try {
      await deleteInvitation(invitationId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(null);
    }
  };

  const copyInvitationLink = async (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/join/${token}`;
    await navigator.clipboard.writeText(link);
  };

  const copyInvitationCode = async (token: string) => {
    await navigator.clipboard.writeText(token);
  };

  const getStatusBadge = (invitation: Invitation) => {
    const now = new Date();

    if (invitation.status === 'revoked') {
      return <Badge variant="destructive">Révoquée</Badge>;
    }

    if (invitation.status === 'expired' || (invitation.expiresAt && invitation.expiresAt < now)) {
      return <Badge variant="secondary">Expirée</Badge>;
    }

    if (invitation.status === 'accepted' && invitation.type === 'email') {
      return <Badge>Acceptée</Badge>;
    }

    if (invitation.maxUses && invitation.usesCount >= invitation.maxUses) {
      return <Badge variant="secondary">Limite atteinte</Badge>;
    }

    return <Badge variant="outline">Active</Badge>;
  };

  const getTypeBadge = (type: string) => {
    return type === 'email' ? (
      <Badge variant="default">Email</Badge>
    ) : (
      <Badge variant="secondary">Lien</Badge>
    );
  };

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Aucune invitation en cours
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitations ({invitations.length})</CardTitle>
        <CardDescription>
          Liste de toutes les invitations envoyées
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Utilisation</TableHead>
                <TableHead>Invité par</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell>{getTypeBadge(invitation.type)}</TableCell>
                  <TableCell className="font-medium">
                    {invitation.type === 'email' && invitation.email ? (
                      invitation.email
                    ) : (
                      <span className="text-muted-foreground">Lien partageable</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                        {invitation.token.substring(0, 8)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyInvitationCode(invitation.token)}
                        title="Copier le code complet"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(invitation)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {invitation.usesCount} / {invitation.maxUses || '∞'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {invitation.inviter?.email || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(invitation.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {invitation.status === 'pending' && invitation.type === 'link' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInvitationLink(invitation.token)}
                          title="Copier le lien"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {invitation.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevoke(invitation.id)}
                          disabled={loading === invitation.id}
                          title="Révoquer"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {(invitation.status === 'expired' || invitation.status === 'revoked' || invitation.status === 'accepted') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(invitation.id)}
                          disabled={loading === invitation.id}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
