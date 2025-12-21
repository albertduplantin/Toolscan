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
import { ArrowLeft, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CameraCapture } from '@/components/cabinets/camera-capture';
import { verifyTools, generateVerificationOverlay } from '@/lib/detection/verification-detector';

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
};

export default function VerifyCabinetPage() {
  const router = useRouter();
  const params = useParams();
  const cabinetId = params.id as string;

  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    missingTools: Tool[];
    presentTools: Tool[];
  } | null>(null);

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

  const handleCapture = async (imageUrl: string) => {
    setCapturedImage(imageUrl);

    if (!cabinet?.emptyImageUrl || !cabinet?.tools || cabinet.tools.length === 0) {
      toast.error('Données de référence manquantes');
      return;
    }

    try {
      // Run real verification algorithm
      toast.loading('Analyse de l\'image en cours...', { id: 'verification' });

      const result = await verifyTools(
        imageUrl,
        cabinet.emptyImageUrl,
        cabinet.tools.map(t => ({
          id: t.id,
          name: t.name,
          position: t.position,
          silhouetteData: t.silhouetteData,
        }))
      );

      // Find missing and present tool objects
      const missing = cabinet.tools.filter(t => result.missingTools.includes(t.id));
      const present = cabinet.tools.filter(t => result.presentTools.includes(t.id));

      setVerificationResult({
        missingTools: missing,
        presentTools: present,
      });

      // Generate overlay image
      if (missing.length > 0) {
        const overlayUrl = await generateVerificationOverlay(
          imageUrl,
          cabinet.tools.map(t => ({
            id: t.id,
            name: t.name,
            position: t.position,
            silhouetteData: t.silhouetteData,
          })),
          result.missingTools
        );
        setCapturedImage(overlayUrl);
      }

      toast.success(
        missing.length === 0
          ? 'Armoire complète ! Tous les outils sont présents'
          : `${missing.length} outil(s) manquant(s) - Score de confiance: ${result.confidenceScore}%`,
        { id: 'verification' }
      );

      // Save verification to database
      try {
        await fetch(`/api/cabinets/${cabinetId}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: result.capturedImageUrl || imageUrl,
            missingToolIds: result.missingTools,
            presentToolIds: result.presentTools,
            confidenceScore: result.confidenceScore,
          }),
        });
      } catch (saveError) {
        console.error('Error saving verification:', saveError);
        // Don't show error to user, verification still works locally
      }
    } catch (error) {
      console.error('Error during verification:', error);
      toast.error('Erreur lors de la vérification', { id: 'verification' });
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setVerificationResult(null);
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

  if (cabinet.status === 'draft') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Configuration requise
            </CardTitle>
            <CardDescription>
              Cette armoire n'est pas encore configurée. Configurez-la avant de
              pouvoir effectuer des vérifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/dashboard/cabinets" className="flex-1">
              <Button variant="outline" className="w-full">
                Retour
              </Button>
            </Link>
            <Link href={`/dashboard/cabinets/${cabinetId}/configure`} className="flex-1">
              <Button className="w-full">Configurer</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/dashboard/cabinets/${cabinetId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux détails
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Vérification de l'armoire</h1>
        <p className="text-muted-foreground">{cabinet.name}</p>
      </div>

      {/* Instructions */}
      {!capturedImage && (
        <Card>
          <CardHeader>
            <CardTitle>Comment vérifier l'armoire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Positionnez-vous face à l'armoire</li>
              <li>Assurez-vous que l'éclairage est similaire à la configuration initiale</li>
              <li>Prenez une photo depuis le même angle que les photos de référence</li>
              <li>Le système comparera automatiquement et affichera les outils manquants</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Camera Capture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {capturedImage ? 'Photo capturée' : 'Prendre une photo'}
          </CardTitle>
          {verificationResult && (
            <CardDescription>
              {verificationResult.missingTools.length === 0 ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Armoire complète - Tous les outils sont présents
                </span>
              ) : (
                <span className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {verificationResult.missingTools.length} outil(s) manquant(s)
                </span>
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <CameraCapture
            value={capturedImage}
            onCapture={handleCapture}
            onRetake={handleRetake}
            referenceImageUrl={cabinet.fullImageUrl}
            silhouettes={cabinet.tools}
            showOverlay={!!verificationResult}
          />
        </CardContent>
      </Card>

      {/* Verification Results */}
      {verificationResult && (
        <>
          {/* Missing Tools */}
          {verificationResult.missingTools.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Outils manquants ({verificationResult.missingTools.length})
                </CardTitle>
                <CardDescription>
                  Les outils suivants ne sont pas détectés dans l'armoire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {verificationResult.missingTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3"
                    >
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-medium">{tool.name}</p>
                        {tool.description && (
                          <p className="text-sm text-muted-foreground">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Present Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Outils présents ({verificationResult.presentTools.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {verificationResult.presentTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">{tool.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleRetake} className="flex-1">
              Reprendre la photo
            </Button>
            <Link href={`/dashboard/cabinets/${cabinetId}`} className="flex-1">
              <Button className="w-full">Terminer</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
