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
import { ArrowLeft, Upload, Camera, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ImageUploader } from '@/components/cabinets/image-uploader';
import { detectSilhouettes } from '@/lib/detection/silhouette-detector';

type Cabinet = {
  id: string;
  name: string;
  description: string | null;
  emptyImageUrl: string | null;
  fullImageUrl: string | null;
  status: string;
};

export default function ConfigureCabinetPage() {
  const router = useRouter();
  const params = useParams();
  const cabinetId = params.id as string;

  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [loading, setLoading] = useState(true);
  const [emptyImageUrl, setEmptyImageUrl] = useState<string | null>(null);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCabinet();
  }, [cabinetId]);

  const fetchCabinet = async () => {
    try {
      const response = await fetch(`/api/cabinets/${cabinetId}`);
      if (!response.ok) throw new Error('Failed to fetch cabinet');

      const data = await response.json();
      setCabinet(data);
      setEmptyImageUrl(data.emptyImageUrl);
      setFullImageUrl(data.fullImageUrl);
    } catch (error) {
      console.error('Error fetching cabinet:', error);
      toast.error('Erreur lors du chargement de l\'armoire');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndDetect = async () => {
    if (!emptyImageUrl || !fullImageUrl) {
      toast.error('Veuillez uploader les deux images');
      return;
    }

    setLoading(true);

    try {
      // Update cabinet with images
      const updateResponse = await fetch(`/api/cabinets/${cabinetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emptyImageUrl,
          fullImageUrl,
          status: 'configured',
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update cabinet');
      }

      toast.success('Images enregistrées avec succès !');

      // Run silhouette detection
      toast.loading('Détection des outils en cours...', { id: 'detection' });

      const detectionResult = await detectSilhouettes(emptyImageUrl, fullImageUrl);

      // Send detection results to backend
      const detectResponse = await fetch(`/api/cabinets/${cabinetId}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          silhouettes: detectionResult.silhouettes,
        }),
      });

      if (!detectResponse.ok) {
        throw new Error('Failed to process detection');
      }

      const detectData = await detectResponse.json();

      toast.success(
        `Détection terminée ! ${detectData.toolsCount} outil(s) détecté(s)`,
        { id: 'detection' }
      );

      // Redirect to cabinet details
      router.push(`/dashboard/cabinets/${cabinetId}`);
    } catch (error) {
      console.error('Error in detection process:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la détection',
        { id: 'detection' }
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && !cabinet) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!cabinet) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Armoire non trouvée</p>
      </div>
    );
  }

  const canProceed = emptyImageUrl && fullImageUrl;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/cabinets">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux armoires
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Configuration de l'armoire</h1>
        <p className="text-muted-foreground">{cabinet.name}</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${emptyImageUrl ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {emptyImageUrl ? <CheckCircle2 className="h-4 w-4" /> : '1'}
          </div>
          <span className={emptyImageUrl ? 'font-medium' : 'text-muted-foreground'}>
            Photo vide
          </span>
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${fullImageUrl ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {fullImageUrl ? <CheckCircle2 className="h-4 w-4" /> : '2'}
          </div>
          <span className={fullImageUrl ? 'font-medium' : 'text-muted-foreground'}>
            Photo pleine
          </span>
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            3
          </div>
          <span className="text-muted-foreground">Détection</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Empty image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photo armoire vide
            </CardTitle>
            <CardDescription>
              Prenez une photo de l'armoire sans aucun outil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              value={emptyImageUrl}
              onChange={setEmptyImageUrl}
              cabinetId={cabinetId}
              imageType="empty"
            />
          </CardContent>
        </Card>

        {/* Full image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photo armoire pleine
            </CardTitle>
            <CardDescription>
              Placez tous les outils et prenez une photo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              value={fullImageUrl}
              onChange={setFullImageUrl}
              cabinetId={cabinetId}
              imageType="full"
            />
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Conseils pour de meilleurs résultats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Prenez les photos depuis le même angle et la même distance</li>
            <li>Assurez-vous que l'éclairage est similaire pour les deux photos</li>
            <li>Évitez les ombres portées sur l'armoire</li>
            <li>Assurez-vous que tous les outils sont bien visibles</li>
            <li>Les outils doivent être à plat et bien organisés</li>
          </ul>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-end gap-4">
        <Link href="/dashboard/cabinets">
          <Button variant="outline" disabled={loading}>
            Annuler
          </Button>
        </Link>
        <Button
          onClick={handleSaveAndDetect}
          disabled={!canProceed || loading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {loading ? 'Enregistrement...' : 'Enregistrer et détecter'}
        </Button>
      </div>
    </div>
  );
}
