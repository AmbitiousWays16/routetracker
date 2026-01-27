import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, X, Users, ShieldCheck } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ASSIGNABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'vp', label: 'VP' },
  { value: 'coo', label: 'COO' },
  { value: 'accountant', label: 'Accountant' },
];

const getRoleBadgeVariant = (role: AppRole) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'coo':
      return 'default';
    case 'vp':
      return 'secondary';
    case 'supervisor':
      return 'outline';
    case 'accountant':
      return 'secondary';
    default:
      return 'outline';
  }
};

const UserManagement = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { users, loading, isAdmin, assignRole, removeRole } = useUserManagement();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const handleAssignRole = async (userId: string, role: string) => {
    if (role && role !== 'none') {
      await assignRole(userId, role as AppRole);
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    await removeRole(userId, role);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">User Management</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tracker
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Manage User Roles
            </CardTitle>
            <CardDescription>
              Assign supervisor, VP, COO, or accountant roles to users to enable the approval workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Roles</TableHead>
                  <TableHead>Assign Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-medium">
                      {u.email || 'No email'}
                      {u.userId === user?.id && (
                        <Badge variant="outline" className="ml-2">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-sm text-muted-foreground">User</span>
                        ) : (
                          u.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={getRoleBadgeVariant(role)}
                              className="gap-1"
                            >
                              {role.toUpperCase()}
                              {role !== 'admin' && (
                                <button
                                  onClick={() => handleRemoveRole(u.userId, role)}
                                  className="ml-1 hover:text-destructive-foreground"
                                  title={`Remove ${role} role`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.roles.includes('admin') ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <Select onValueChange={(value) => handleAssignRole(u.userId, value)}>
                          <SelectTrigger className="w-40 bg-background">
                            <SelectValue placeholder="Add role..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {ASSIGNABLE_ROLES.filter(
                              (r) => !u.roles.includes(r.value)
                            ).map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserManagement;
