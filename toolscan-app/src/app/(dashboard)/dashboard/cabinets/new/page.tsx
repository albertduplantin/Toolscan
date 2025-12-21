'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NewCabinetPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Veuillez entrer un nom pour l\'armoire');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/cabinets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création');
      }

      const cabinet = await response.json();
      toast.success('Armoire créée avec succès !');
      router.push(`/dashboard/cabinets/${cabinet.id}/configure`);
    } catch (error) {
      console.error('Error creating cabinet:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la création'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/cabinets">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux armoires
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Nouvelle armoire</h1>
        <p className="text-muted-foreground">
          Créez une nouvelle armoire d'outillage
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations de base</CardTitle>
          <CardDescription>
            Donnez un nom et une description à votre armoire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'armoire *</Label>
              <Input
                id="name"
                placeholder="Armoire principale atelier"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Choisissez un nom facilement identifiable
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                placeholder="Armoire située dans l'atelier principal, contient les outils de base pour les élèves de BAC PRO MSPC"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Link href="/dashboard/cabinets" className="flex-1">
                <Button type="button" variant="outline" className="w-full" disabled={loading}>
                  Annuler
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Création...' : 'Créer et configurer'}
              </Button>
            </div>
          </form>

          <div className="mt-8 space-y-4 border-t pt-6">
            <h3 className="text-sm font-medium">Prochaines étapes :</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  1
                </span>
                <span>Prendre une photo de l'armoire vide</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  2
                </span>
                <span>Placer tous les outils dans l'armoire</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  3
                </span>
                <span>Prendre une photo de l'armoire pleine</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  4
                </span>
                <span>Configurer les outils détectés automatiquement</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
