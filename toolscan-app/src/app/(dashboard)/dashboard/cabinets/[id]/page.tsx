'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Camera,
  Package,
  AlertCircle,
  History,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { ToolDetectionOverlay } from '@/components/cabinets/tool-detection-overlay';

type Tool = {
  id: string;
  name: string;
  description: string | null;
  silhouetteData: any;
  position: any;
};

type Cabinet = {
  id: string;
  name: string;
  description: string | null;
  emptyImageUrl: string | null;
  fullImageUrl: string | null;
  status: string;
  tools: Tool[];
  createdAt: string;
  updatedAt: string;
};

export default function CabinetDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const cabinetId = params.id as string;

  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCabinet();
  }, [cabinetId]);

  const fetchCabinet = async () => {
    try {
      const response = await fetch(`/api/cabinets/${cabinetId}`);
      if (!response.ok) throw new Error('Failed to fetch cabinet');

      const data = await response.json();
      setCabinet(data);
    } catch (error) {
      console.error('Error fetching cabinet:', error);
      toast.error('Erreur lors du chargement de l\'armoire');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!cabinet) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Armoire non trouvée</p>
          <Link href="/dashboard/cabinets">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux armoires
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/cabinets">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux armoires
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{cabinet.name}</h1>
            {cabinet.description && (
              <p className="mt-2 text-muted-foreground">{cabinet.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(cabinet.status)}
            <Link href={`/dashboard/cabinets/${cabinetId}/history`}>
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                Historique
              </Button>
            </Link>
            <Link href={`/dashboard/cabinets/${cabinetId}/configure`}>
              <Button variant="outline" size="sm">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Reconfigurer
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Images section */}
      {(cabinet.emptyImageUrl || cabinet.fullImageUrl) && (
        <div className="grid gap-6 md:grid-cols-2">
          {cabinet.emptyImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photo armoire vide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={cabinet.emptyImageUrl}
                    alt="Armoire vide"
                    fill
                    className="object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {cabinet.fullImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photo armoire pleine avec outils détectés</CardTitle>
                <CardDescription>
                  {cabinet.tools?.length || 0} outil(s) identifié(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cabinet.tools && cabinet.tools.length > 0 ? (
                  <ToolDetectionOverlay
                    imageUrl={cabinet.fullImageUrl}
                    tools={cabinet.tools}
                    highlightedToolIds={cabinet.tools.map(t => t.id)}
                    showLabels={true}
                    className="w-full"
                  />
                ) : (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={cabinet.fullImageUrl}
                      alt="Armoire pleine"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tools section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Outils configurés</CardTitle>
              <CardDescription>
                {cabinet.tools?.length || 0} outil(s) détecté(s) dans cette armoire
              </CardDescription>
            </div>
            {cabinet.status === 'configured' && cabinet.tools?.length > 0 && (
              <Link href={`/dashboard/cabinets/${cabinetId}/verify`}>
                <Button>
                  <Camera className="mr-2 h-4 w-4" />
                  Vérifier l'armoire
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!cabinet.tools || cabinet.tools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground" />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Aucun outil configuré pour le moment.
                <br />
                {cabinet.status === 'draft' ? (
                  <>
                    Configurez cette armoire pour détecter automatiquement les
                    outils.
                  </>
                ) : (
                  <>
                    Les outils seront détectés après l'upload des deux photos.
                  </>
                )}
              </p>
              {cabinet.status === 'draft' && (
                <Link href={`/dashboard/cabinets/${cabinetId}/configure`}>
                  <Button className="mt-4">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Configurer maintenant
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cabinet.tools.map((tool) => (
                <Card key={tool.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{tool.name}</CardTitle>
                    {tool.description && (
                      <CardDescription className="line-clamp-2">
                        {tool.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      {cabinet.status === 'draft' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Configuration requise
            </CardTitle>
            <CardDescription>
              Cette armoire n'est pas encore configurée. Uploadez les photos pour
              activer la détection automatique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/dashboard/cabinets/${cabinetId}/configure`}>
              <Button>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Configurer l'armoire
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
