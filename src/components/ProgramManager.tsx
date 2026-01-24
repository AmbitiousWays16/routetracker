import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Program } from '@/hooks/usePrograms';

interface ProgramManagerProps {
  programs: Program[];
  loading: boolean;
  onAdd: (name: string, address: string) => Promise<Program | null>;
  onUpdate: (id: string, updates: { name?: string; address?: string }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export const ProgramManager = ({
  programs,
  loading,
  onAdd,
  onUpdate,
  onDelete,
}: ProgramManagerProps) => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsSubmitting(true);
    const result = await onAdd(newName, newAddress);
    if (result) {
      setNewName('');
      setNewAddress('');
    }
    setIsSubmitting(false);
  };

  const handleEdit = (program: Program) => {
    setEditingId(program.id);
    setEditName(program.name);
    setEditAddress(program.address);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setIsSubmitting(true);
    const success = await onUpdate(editingId, { name: editName, address: editAddress });
    if (success) {
      setEditingId(null);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    await onDelete(id);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Programs</DialogTitle>
          <DialogDescription>
            Add, edit, or remove programs. Set a default address for each program to auto-fill the
            destination.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Add new program */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="mb-3 text-sm font-medium">Add New Program</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="new-name" className="text-xs">
                  Program Name
                </Label>
                <Input
                  id="new-name"
                  placeholder="e.g., Hospital Visit"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-address" className="text-xs">
                  Default Address (optional)
                </Label>
                <Input
                  id="new-address"
                  placeholder="e.g., 123 Main St, City, State"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={!newName.trim() || isSubmitting}
                size="sm"
                className="w-full"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Program
              </Button>
            </div>
          </div>

          {/* Program list */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Programs</h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : programs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No programs yet</p>
            ) : (
              <div className="space-y-2">
                {programs.map((program) => (
                  <div
                    key={program.id}
                    className="rounded-lg border bg-background p-3"
                  >
                    {editingId === program.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Address</Label>
                          <Input
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            placeholder="No default address"
                            className="mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={!editName.trim() || isSubmitting}
                          >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{program.name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {program.address || 'No default address'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(program)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(program.id)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
