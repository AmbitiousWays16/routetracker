import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  setDoc,
  doc,
  orderBy,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { chunk } from '@/lib/utils';

// Local type replacing Supabase Database enum
export type AppRole = 'admin' | 'supervisor' | 'vp' | 'coo' | 'user';

export interface UserWithRoles {
  userId: string;
  email: string | null;
  roles: AppRole[];
  supervisorId?: string | null;
}

export const useUserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = useCallback(async () => {
    if (!user) { setIsAdmin(false); return false; }
    try {
      const q = query(
        collection(db, 'user_roles'),
        where('user_id', '==', user.uid),
        where('role', '==', 'admin')
      );
      const snapshot = await getDocs(q);
      const adminStatus = !snapshot.empty;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      return false;
    }
  }, [user]);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profilesSnap = await getDocs(
        query(collection(db, 'profiles'), orderBy('email'))
      );

      const userIds = profilesSnap.docs
        .map((d) => (d.data() as { user_id: string }).user_id)
        .filter(Boolean);

      // Fetch roles in batches of 30 (Firestore 'in' clause limit)
      const rolesData: { user_id: string; role: AppRole }[] = [];
      for (const batch of chunk(userIds, 30)) {
        const rolesSnap = await getDocs(
          query(collection(db, 'user_roles'), where('user_id', 'in', batch))
        );
        rolesSnap.docs.forEach((d) =>
          rolesData.push(d.data() as { user_id: string; role: AppRole })
        );
      }

      // Fetch supervisor assignments
      const supervisorData: { user_id: string; supervisor_id: string }[] = [];
      for (const batch of chunk(userIds, 30)) {
        const supSnap = await getDocs(
          query(collection(db, 'user_supervisors'), where('user_id', 'in', batch))
        );
        supSnap.docs.forEach((d) =>
          supervisorData.push(d.data() as { user_id: string; supervisor_id: string })
        );
      }

      const usersWithRoles: UserWithRoles[] = profilesSnap.docs.map((d) => {
        const profile = d.data() as { user_id: string; email: string };
        const sup = supervisorData.find((s) => s.user_id === profile.user_id);
        return {
          userId: profile.user_id,
          email: profile.email,
          roles: rolesData.filter((r) => r.user_id === profile.user_id).map((r) => r.role),
          supervisorId: sup?.supervisor_id ?? null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      const adminStatus = await checkAdminStatus();
      if (adminStatus) await fetchUsers();
      else setLoading(false);
    };
    init();
  }, [checkAdminStatus, fetchUsers]);

  const assignRole = useCallback(async (userId: string, role: AppRole): Promise<boolean> => {
    if (!user || !isAdmin) { toast.error('Only admins can assign roles'); return false; }
    if (role === 'admin') { toast.error('Cannot assign admin role'); return false; }
    if (role === 'user') { toast.error('User role is default and cannot be assigned'); return false; }

    try {
      // Check if role already exists
      const existing = await getDocs(
        query(collection(db, 'user_roles'), where('user_id', '==', userId), where('role', '==', role))
      );
      if (!existing.empty) { toast.error('User already has this role'); return false; }

      await addDoc(collection(db, 'user_roles'), { user_id: userId, role });
      setUsers((prev) =>
        prev.map((u) => u.userId === userId ? { ...u, roles: [...u.roles, role] } : u)
      );
      toast.success('Role assigned successfully');
      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
      return false;
    }
  }, [user, isAdmin]);

  const removeRole = useCallback(async (userId: string, role: AppRole): Promise<boolean> => {
    if (!user || !isAdmin) { toast.error('Only admins can remove roles'); return false; }
    if (role === 'admin') { toast.error('Cannot remove admin role'); return false; }

    try {
      const q = query(
        collection(db, 'user_roles'),
        where('user_id', '==', userId),
        where('role', '==', role)
      );
      const snapshot = await getDocs(q);
      await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));

      setUsers((prev) =>
        prev.map((u) => u.userId === userId ? { ...u, roles: u.roles.filter((r) => r !== role) } : u)
      );
      toast.success('Role removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
      return false;
    }
  }, [user, isAdmin]);

  const assignSupervisor = useCallback(async (userId: string, supervisorId: string): Promise<boolean> => {
    if (!user || !isAdmin) { toast.error('Only admins can assign supervisors'); return false; }
    if (userId === supervisorId) { toast.error('A user cannot be their own supervisor'); return false; }

    try {
      // Verify the target user has the 'supervisor' role in Firestore
      const supervisorRoleSnap = await getDocs(
        query(collection(db, 'user_roles'), where('user_id', '==', supervisorId), where('role', '==', 'supervisor'))
      );
      if (supervisorRoleSnap.empty) {
        toast.error('The selected user does not have the Supervisor role');
        return false;
      }

      await setDoc(doc(db, 'user_supervisors', userId), { user_id: userId, supervisor_id: supervisorId });
      setUsers((prev) =>
        prev.map((u) => u.userId === userId ? { ...u, supervisorId } : u)
      );
      toast.success('Supervisor assigned successfully');
      return true;
    } catch (error) {
      console.error('Error assigning supervisor:', error);
      toast.error('Failed to assign supervisor');
      return false;
    }
  }, [user, isAdmin]);

  const removeSupervisor = useCallback(async (userId: string): Promise<boolean> => {
    if (!user || !isAdmin) { toast.error('Only admins can remove supervisors'); return false; }

    try {
      await deleteDoc(doc(db, 'user_supervisors', userId));
      setUsers((prev) =>
        prev.map((u) => u.userId === userId ? { ...u, supervisorId: null } : u)
      );
      toast.success('Supervisor removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing supervisor:', error);
      toast.error('Failed to remove supervisor');
      return false;
    }
  }, [user, isAdmin]);

  return { users, loading, isAdmin, assignRole, removeRole, assignSupervisor, removeSupervisor, refetch: fetchUsers };
};
