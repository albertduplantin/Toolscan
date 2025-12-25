'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { updateUser, deleteUser } from '@/lib/actions/users';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/input';

interface UserActionsProps {
  userId: string;
  userEmail: string;
  currentRole: string;
  currentPhoneNumber?: string | null;
  isCurrentUser: boolean;
}

export function UserActions({ userId, userEmail, currentRole, currentPhoneNumber, isCurrentUser }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>(
    currentRole === 'admin' ? 'admin' : 'user'
  );
  const [phoneNumber, setPhoneNumber] = useState(currentPhoneNumber || '');

  // Don't show actions for current user or super_admin
  if (isCurrentUser || currentRole === 'super_admin') {
    return null;
  }

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updateUser(userId, {
        role: selectedRole,
        phoneNumber: phoneNumber.trim() || undefined,
      });
      toast.success('Utilisateur mis à jour avec succès');
      setEditDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteUser(userId);
      toast.success('Utilisateur supprimé avec succès');
      setDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifier les informations de {userEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as 'user' | 'admin')}
                disabled={loading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Optionnel - Format international recommandé
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? 'Mise à jour...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {userEmail} ?
              Cette action est irréversible et supprimera l'utilisateur de Clerk et de la base de données.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
