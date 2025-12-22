'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createLinkInvitation } from '@/lib/actions/invitations';
import { useRouter } from 'next/navigation';
import { Link as LinkIcon, Copy, Check } from 'lucide-react';

export function CreateInviteLinkButton() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [expiresInDays, setExpiresInDays] = useState<string>('7');
  const [maxUses, setMaxUses] = useState<string>('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const invitation = await createLinkInvitation({
        role,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
      });

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/join/${invitation.token}`;
      setGeneratedLink(link);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setShowForm(false);
    setGeneratedLink('');
    setRole('user');
    setExpiresInDays('7');
    setMaxUses('10');
    setError('');
  };

  if (!showForm) {
    return (
      <Button variant="outline" onClick={() => setShowForm(true)}>
        <LinkIcon className="mr-2 h-4 w-4" />
        Créer un lien d'invitation
      </Button>
    );
  }

  if (generatedLink) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Lien d'invitation créé</CardTitle>
          <CardDescription>
            Partagez ce lien avec les personnes que vous souhaitez inviter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={generatedLink} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              title="Copier le lien"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Ce lien expirera dans {expiresInDays || '∞'} jours et peut être utilisé {maxUses || '∞'} fois.
          </p>
          <Button variant="outline" onClick={handleClose} className="w-full">
            Fermer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Créer un lien d'invitation</CardTitle>
        <CardDescription>
          Générez un lien partageable pour inviter plusieurs personnes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expires">Expiration (jours)</Label>
            <Input
              id="expires"
              type="number"
              min="1"
              placeholder="7 (laissez vide pour jamais)"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxUses">Nombre max d'utilisations</Label>
            <Input
              id="maxUses"
              type="number"
              min="1"
              placeholder="10 (laissez vide pour illimité)"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Génération...' : 'Générer le lien'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
