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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertCircle, CheckCircle2, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import Image from 'next/image';

type Verification = {
  id: string;
  imageUrl: string;
  resultData: {
    missingTools: string[];
    presentTools: string[];
    confidenceScore: number;
    totalTools: number;
  };
  missingCount: number;
  completionRate: string;
  verifiedAt: string;
  verifier: {
    id: string;
    email: string;
  };
};

type Cabinet = {
  id: string;
  name: string;
  description: string | null;
};

export default function VerificationHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const cabinetId = params.id as string;

  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);

  useEffect(() => {
    fetchData();
  }, [cabinetId]);

  const fetchData = async () => {
    try {
      // Fetch cabinet info
      const cabinetResponse = await fetch(`/api/cabinets/${cabinetId}`);
      if (!cabinetResponse.ok) throw new Error('Failed to fetch cabinet');
      const cabinetData = await cabinetResponse.json();
      setCabinet(cabinetData);

      // Fetch verification history
      const historyResponse = await fetch(`/api/cabinets/${cabinetId}/verify`);
      if (!historyResponse.ok) throw new Error('Failed to fetch history');
      const historyData = await historyResponse.json();
      setVerifications(historyData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const getCompletionBadge = (completionRate: string) => {
    const rate = parseFloat(completionRate);
    if (rate === 100) {
      return <Badge className="bg-green-600">Complet</Badge>;
    } else if (rate >= 80) {
      return <Badge variant="outline">Presque complet</Badge>;
    } else if (rate >= 50) {
      return <Badge variant="secondary">Incomplet</Badge>;
    } else {
      return <Badge variant="destructive">Très incomplet</Badge>;
    }
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
        <Link href={`/dashboard/cabinets/${cabinetId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux détails
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Historique des vérifications</h1>
        <p className="text-muted-foreground">{cabinet.name}</p>
      </div>

      {/* Statistics Summary */}
      {verifications.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total des vérifications</CardDescription>
              <CardTitle className="text-3xl">{verifications.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Dernière vérification</CardDescription>
              <CardTitle className="text-lg">
                {formatDate(verifications[0].verifiedAt)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Taux de complétion moyen</CardDescription>
              <CardTitle className="text-3xl">
                {(
                  verifications.reduce((sum, v) => sum + parseFloat(v.completionRate), 0) /
                  verifications.length
                ).toFixed(0)}
                %
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Verifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique complet</CardTitle>
          <CardDescription>
            Liste de toutes les vérifications effectuées sur cette armoire
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground" />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Aucune vérification effectuée pour le moment.
                <br />
                Commencez par vérifier cette armoire.
              </p>
              <Link href={`/dashboard/cabinets/${cabinetId}/verify`}>
                <Button className="mt-4">Vérifier maintenant</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vérifié par</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Outils manquants</TableHead>
                    <TableHead className="text-right">Complétion</TableHead>
                    <TableHead className="text-right">Confiance</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.map((verification) => (
                    <TableRow key={verification.id}>
                      <TableCell className="font-medium">
                        {formatDateTime(verification.verifiedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{verification.verifier.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getCompletionBadge(verification.completionRate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {verification.missingCount > 0 ? (
                          <span className="flex items-center justify-end gap-1 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {verification.missingCount}
                          </span>
                        ) : (
                          <span className="flex items-center justify-end gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(verification.completionRate).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {verification.resultData.confidenceScore}%
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVerification(verification)}
                        >
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Detail Modal */}
      {selectedVerification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedVerification(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Détails de la vérification</CardTitle>
              <CardDescription>
                {formatDateTime(selectedVerification.verifiedAt)} par{' '}
                {selectedVerification.verifier.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Captured Image */}
              <div>
                <h3 className="mb-2 text-sm font-medium">Photo capturée</h3>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                  <Image
                    src={selectedVerification.imageUrl}
                    alt="Vérification"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Statistics */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Outils totaux</p>
                  <p className="text-2xl font-bold">
                    {selectedVerification.resultData.totalTools}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outils manquants</p>
                  <p className="text-2xl font-bold text-destructive">
                    {selectedVerification.missingCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Complétion</p>
                  <p className="text-2xl font-bold">
                    {parseFloat(selectedVerification.completionRate).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button onClick={() => setSelectedVerification(null)}>Fermer</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
