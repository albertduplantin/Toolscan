'use client';

import { useState, useEffect } from 'react';
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
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type AnalyticsData = {
  overview: {
    totalCabinets: number;
    totalVerifications: number;
    averageCompletionRate: number;
    totalMissingTools: number;
  };
  recentVerifications: Array<{
    id: string;
    cabinetName: string;
    cabinetId: string;
    missingCount: number;
    completionRate: string;
    verifiedAt: string;
    verifierEmail: string;
  }>;
  cabinetStats: Array<{
    cabinetId: string;
    cabinetName: string;
    verificationsCount: number;
    averageCompletionRate: number;
    lastVerifiedAt: string | null;
  }>;
  trends: {
    lastWeek: number;
    lastMonth: number;
    trend: 'up' | 'down' | 'stable';
  };
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    toast.loading(`Export ${format.toUpperCase()} en cours...`, { id: 'export' });

    try {
      const response = await fetch(`/api/analytics/export?format=${format}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export réussi !', { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export', { id: 'export' });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Chargement des analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble des vérifications et statistiques
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Armoires totales</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalCabinets}</div>
            <p className="text-xs text-muted-foreground">
              Armoires configurées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vérifications</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalVerifications}</div>
            <p className="text-xs text-muted-foreground">
              {data.trends.lastWeek > 0 && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{data.trends.lastWeek} cette semaine
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux moyen</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.averageCompletionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Complétion moyenne
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outils manquants</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {data.overview.totalMissingTools}
            </div>
            <p className="text-xs text-muted-foreground">
              Actuellement manquants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cabinet Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques par armoire</CardTitle>
          <CardDescription>
            Performance de chaque armoire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Armoire</TableHead>
                <TableHead className="text-right">Vérifications</TableHead>
                <TableHead className="text-right">Taux moyen</TableHead>
                <TableHead className="text-right">Dernière vérif.</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cabinetStats.map((stat) => (
                <TableRow key={stat.cabinetId}>
                  <TableCell className="font-medium">{stat.cabinetName}</TableCell>
                  <TableCell className="text-right">{stat.verificationsCount}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={stat.averageCompletionRate >= 80 ? 'default' : 'secondary'}
                    >
                      {stat.averageCompletionRate.toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {stat.lastVerifiedAt
                      ? new Date(stat.lastVerifiedAt).toLocaleDateString('fr-FR')
                      : 'Jamais'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/cabinets/${stat.cabinetId}`}>
                      <Button variant="ghost" size="sm">
                        Voir
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Verifications */}
      <Card>
        <CardHeader>
          <CardTitle>Vérifications récentes</CardTitle>
          <CardDescription>
            Les 10 dernières vérifications effectuées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentVerifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground" />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Aucune vérification effectuée pour le moment
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Armoire</TableHead>
                  <TableHead>Vérifié par</TableHead>
                  <TableHead className="text-right">Manquants</TableHead>
                  <TableHead className="text-right">Complétion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentVerifications.map((verif) => (
                  <TableRow key={verif.id}>
                    <TableCell>
                      {new Date(verif.verifiedAt).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/cabinets/${verif.cabinetId}`}
                        className="hover:underline"
                      >
                        {verif.cabinetName}
                      </Link>
                    </TableCell>
                    <TableCell>{verif.verifierEmail}</TableCell>
                    <TableCell className="text-right">
                      {verif.missingCount > 0 ? (
                        <span className="text-destructive">{verif.missingCount}</span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(verif.completionRate).toFixed(0)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
