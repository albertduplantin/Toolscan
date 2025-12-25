'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createTenant } from '@/lib/actions/tenant';
import { ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantName, setTenantName] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const invitationToken = searchParams.get('invitation');
  const syncParam = searchParams.get('sync');

  useEffect(() => {
    // If there's an invitation token, redirect to join page
    if (invitationToken) {
      router.push(`/join/${invitationToken}`);
      return;
    }

    // Check if user already has a tenant
    async function checkUserTenant() {
      try {
        // If sync=true, wait a bit for webhook to process
        if (syncParam === 'true') {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const response = await fetch('/api/user/me');
        if (response.ok) {
          const user = await response.json();
          if (user && user.tenantId) {
            // User already has a tenant, redirect to dashboard
            router.push('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking user tenant:', error);
      } finally {
        setCheckingUser(false);
      }
    }

    checkUserTenant();
  }, [invitationToken, syncParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'create') {
      if (!tenantName.trim()) {
        toast.error('Veuillez entrer un nom pour votre organisation');
        return;
      }

      setLoading(true);

      try {
        await createTenant(tenantName);
        toast.success('Organisation créée avec succès !');
        router.push('/dashboard');
        router.refresh();
      } catch (error) {
        console.error('Error creating tenant:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Erreur lors de la création de l\'organisation'
        );
      } finally {
        setLoading(false);
      }
    } else {
      // Join mode
      if (!invitationCode.trim()) {
        toast.error('Veuillez entrer un code d\'invitation');
        return;
      }

      setLoading(true);

      try {
        // Redirect to join page with the token
        router.push(`/join/${invitationCode.trim()}`);
      } catch (error) {
        console.error('Error joining organization:', error);
        toast.error('Code d\'invitation invalide');
        setLoading(false);
      }
    }
  };

  // Show loading while checking user or redirecting to invitation
  if (invitationToken || checkingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>
              {invitationToken ? 'Traitement de l\'invitation...' : 'Vérification...'}
            </CardTitle>
            <CardDescription>Veuillez patienter</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary p-3 text-primary-foreground">
              <ScanLine className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">Bienvenue sur ToolScan</CardTitle>
          <CardDescription>
            {mode === 'create'
              ? 'Créez votre organisation ou rejoignez une équipe existante'
              : 'Rejoignez une organisation avec un code d\'invitation'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mode Toggle */}
          <div className="mb-6 flex gap-2 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                mode === 'create'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Créer une organisation
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                mode === 'join'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Rejoindre une équipe
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'create' ? (
              <div className="space-y-2">
                <Label htmlFor="tenantName">Nom de l'organisation</Label>
                <Input
                  id="tenantName"
                  placeholder="Mon entreprise"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Vous pourrez inviter des membres d'équipe plus tard
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="invitationCode">Code d'invitation</Label>
                <Input
                  id="invitationCode"
                  placeholder="Collez votre code d'invitation"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Le code d'invitation vous a été envoyé par email ou partagé par un administrateur
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? (mode === 'create' ? 'Création en cours...' : 'Vérification...')
                : (mode === 'create' ? 'Créer mon organisation' : 'Rejoindre l\'organisation')}
            </Button>
          </form>

          {mode === 'create' && (
            <div className="mt-6 space-y-4 border-t pt-6">
              <h3 className="text-sm font-medium">Prochaines étapes :</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    1
                  </span>
                  <span>Créez votre première armoire d'outillage</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    2
                  </span>
                  <span>Configurez la détection des outils</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    3
                  </span>
                  <span>Commencez à vérifier vos armoires</span>
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Chargement...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
