import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface Program {
  id: string;
  name: string;
  address: string;
}

const STORAGE_KEY = 'mileage-programs';

const DEFAULT_PROGRAMS: Program[] = [
  { id: '1', name: 'General Business', address: '' },
  { id: '2', name: 'Client Visit', address: '' },
  { id: '3', name: 'Training', address: '' },
  { id: '4', name: 'Conference', address: '' },
  { id: '5', name: 'Delivery', address: '' },
  { id: '6', name: 'Site Inspection', address: '' },
  { id: '7', name: 'Other', address: '' },
];

const loadPrograms = (): Program[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PROGRAMS;
  } catch {
    return DEFAULT_PROGRAMS;
  }
};

const savePrograms = (programs: Program[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
};

export const usePrograms = () => {
  const [programs, setPrograms] = useState<Program[]>(loadPrograms);
  const [loading] = useState(false);

  const addProgram = useCallback(async (name: string, address: string = ''): Promise<Program | null> => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    // Check for duplicate
    if (programs.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('A program with this name already exists');
      return null;
    }

    const newProgram: Program = {
      id: crypto.randomUUID(),
      name: trimmedName,
      address: address.trim(),
    };

    setPrograms((prev) => {
      const updated = [...prev, newProgram].sort((a, b) => a.name.localeCompare(b.name));
      savePrograms(updated);
      return updated;
    });

    toast.success('Program added');
    return newProgram;
  }, [programs]);

  const updateProgram = useCallback(async (id: string, updates: { name?: string; address?: string }): Promise<boolean> => {
    const trimmedName = updates.name?.trim();

    // Check for duplicate name
    if (trimmedName && programs.some((p) => p.id !== id && p.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('A program with this name already exists');
      return false;
    }

    setPrograms((prev) => {
      const updated = prev
        .map((p) =>
          p.id === id
            ? {
                ...p,
                name: trimmedName ?? p.name,
                address: updates.address?.trim() ?? p.address,
              }
            : p
        )
        .sort((a, b) => a.name.localeCompare(b.name));
      savePrograms(updated);
      return updated;
    });

    toast.success('Program updated');
    return true;
  }, [programs]);

  const deleteProgram = useCallback(async (id: string): Promise<boolean> => {
    setPrograms((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      savePrograms(updated);
      return updated;
    });

    toast.success('Program deleted');
    return true;
  }, []);

  const refetch = useCallback(() => {
    setPrograms(loadPrograms());
  }, []);

  return {
    programs,
    loading,
    addProgram,
    updateProgram,
    deleteProgram,
    refetch,
  };
};
