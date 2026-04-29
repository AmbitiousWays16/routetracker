import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserManagement } from '@/hooks/useUserManagement';
import { usePrograms } from '@/hooks/usePrograms';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  ArrowLeft,
  X,
  ShieldCheck,
  Mail,
  Building2,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
} from 'lucide-react';
import type { AppRole } from '@/hooks/useUserManagement';
import { toast } from 'sonner';

const ASSIGNABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'vp', label: 'VP' },
  { value: 'coo', label: 'COO' },
  { value: 'accountant' as AppRole, label: 'Accountant' },
];

const getRoleBadgeVariant = (role: AppRole) => {
  switch (role) {
    case 'admin': return 'destructive';
    case 'coo': return 'default';
    case 'vp': return 'secondary';
    case 'supervisor': return 'outline';
    default: return 'outline';
  }
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    users,
    loading: usersLoading,
    isAdmin,
    assignRole,
    removeRole,
    assignSupervisor,
    removeSupervisor,
  } = useUserManagement();
  const {
    programs,
    loading: programsLoading,
    addProgram,
    updateProgram,
    deleteProgram,
  } = usePrograms();

  // Invite user state
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Programs state
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramAddress, setNewProgramAddress] = useState('');
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editProgramName, setEditProgramName] = useState('');
  const [editProgramAddress, setEditProgramAddress] = useState('');
  const [isProgramSubmitting, setIsProgramSubmitting] = useState(false);

  useEffect(() => {
    if (!usersLoading && !isAdmin) navigate('/');
  }, [usersLoading, isAdmin, navigate]);

  if (usersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return null;

  // ── Role management ───────────────────────────────────────────────
  const handleAssignRole = async (userId: string, role: string) => {
    if (role && role !== 'none') await assignRole(userId, role as AppRole);
  };

  // ── Supervisor assignment ─────────────────────────────────────────
  const handleAssignSupervisor = async (userId: string, supervisorId: string) => {
    if (supervisorId === 'none') {
      await removeSupervisor(userId);
    } else {
      await assignSupervisor(userId, supervisorId);
    }
  };

  const supervisorOptions = users.filter((u) => u.roles.includes('supervisor'));

  // ── Invite user ───────────────────────────────────────────────────
  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) { toast.error('Please enter an email address'); return; }

    setIsInviting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { toast.error('You must be signed in'); return; }

      const token = await currentUser.getIdToken();
      const url = import.meta.env.VITE_INVITE_USER_URL;
      if (!url) { toast.error('Invite function URL not configured'); return; }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error ?? 'Failed to send invitation');
        return;
      }

      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  // ── Programs management ───────────────────────────────────────────
  const handleAddProgram = async () => {
    if (!newProgramName.trim()) return;
    setIsProgramSubmitting(true);
    const result = await addProgram(newProgramName, newProgramAddress);
    if (result) {
      setNewProgramName('');
      setNewProgramAddress('');
    }
    setIsProgramSubmitting(false);
  };

  const handleStartEditProgram = (id: string, name: string, address: string) => {
    setEditingProgramId(id);
    setEditProgramName(name);
    setEditProgramAddress(address);
  };

  const handleSaveEditProgram = async () => {
    if (!editingProgramId || !editProgramName.trim()) return;
    setIsProgramSubmitting(true);
    const success = await updateProgram(editingProgramId, { name: editProgramName, address: editProgramAddress });
    if (success) setEditingProgramId(null);
    setIsProgramSubmitting(false);
  };

  const handleDeleteProgram = async (id: string) => {
    setIsProgramSubmitting(true);
    await deleteProgram(id);
    setIsProgramSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Tracker</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="gap-2">
              <ShieldCheck className="h-4 w-4" />Users &amp; Roles
            </TabsTrigger>
            <TabsTrigger value="programs" className="gap-2">
              <Building2 className="h-4 w-4" />Programs
            </TabsTrigger>
            <TabsTrigger value="invite" className="gap-2">
              <Mail className="h-4 w-4" />Invite Users
            </TabsTrigger>
          </TabsList>

          {/* ── Users & Roles tab ── */}
          <TabsContent value="users" className="space-y-6 pt-4">
            {/* Roles & permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />Manage User Roles
                </CardTitle>
                <CardDescription>
                  Assign supervisor, VP, COO, or accountant roles to users to enable the approval
                  workflow.
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
                          {u.userId === user?.uid && (
                            <Badge variant="outline" className="ml-2">You</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 ? (
                              <span className="text-sm text-muted-foreground">User</span>
                            ) : (
                              u.roles.map((role) => (
                                <Badge key={role} variant={getRoleBadgeVariant(role)} className="gap-1">
                                  {role.toUpperCase()}
                                  {role !== 'admin' && (
                                    <button
                                      onClick={() => removeRole(u.userId, role)}
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
                                {ASSIGNABLE_ROLES.filter((r) => !u.roles.includes(r.value)).map((role) => (
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

            {/* Supervisor assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />Assign Supervisors
                </CardTitle>
                <CardDescription>
                  Assign a supervisor to each regular user. Supervisors must already have the
                  Supervisor role.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {supervisorOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No supervisors found. Assign the Supervisor role to a user first.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Assigned Supervisor</TableHead>
                        <TableHead>Change Supervisor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users
                        .filter((u) => !u.roles.includes('admin') && !u.roles.includes('supervisor'))
                        .map((u) => {
                          const currentSup = users.find((s) => s.userId === u.supervisorId);
                          return (
                            <TableRow key={u.userId}>
                              <TableCell className="font-medium">
                                {u.email || 'No email'}
                                {u.userId === user?.uid && (
                                  <Badge variant="outline" className="ml-2">You</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {currentSup ? (
                                  <span className="text-sm">{currentSup.email}</span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Unassigned</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={u.supervisorId ?? 'none'}
                                  onValueChange={(value) => handleAssignSupervisor(u.userId, value)}
                                >
                                  <SelectTrigger className="w-52 bg-background">
                                    <SelectValue placeholder="Select supervisor..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover">
                                    <SelectItem value="none">— None —</SelectItem>
                                    {supervisorOptions.map((sup) => (
                                      <SelectItem key={sup.userId} value={sup.userId}>
                                        {sup.email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {users.filter(
                        (u) => !u.roles.includes('admin') && !u.roles.includes('supervisor')
                      ).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No non-supervisor users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Programs tab ── */}
          <TabsContent value="programs" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />Manage Programs
                </CardTitle>
                <CardDescription>
                  Add, edit, or remove programs. Set a default address for each program to auto-fill
                  the destination when users log trips.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add new program */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="mb-3 text-sm font-medium">Add New Program</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="prog-name" className="text-xs">Program Name</Label>
                      <Input
                        id="prog-name"
                        placeholder="e.g., Community Outreach"
                        value={newProgramName}
                        onChange={(e) => setNewProgramName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddProgram()}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="prog-address" className="text-xs">Default Address (optional)</Label>
                      <Input
                        id="prog-address"
                        placeholder="e.g., 123 Main St, City"
                        value={newProgramAddress}
                        onChange={(e) => setNewProgramAddress(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddProgram()}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddProgram}
                    disabled={!newProgramName.trim() || isProgramSubmitting}
                    size="sm"
                    className="mt-3"
                  >
                    {isProgramSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add Program
                  </Button>
                </div>

                {/* Program list */}
                {programsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : programs.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No programs yet</p>
                ) : (
                  <div className="space-y-2">
                    {programs.map((program) => (
                      <div key={program.id} className="rounded-lg border bg-background p-3">
                        {editingProgramId === program.id ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Name</Label>
                              <Input
                                value={editProgramName}
                                onChange={(e) => setEditProgramName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Address</Label>
                              <Input
                                value={editProgramAddress}
                                onChange={(e) => setEditProgramAddress(e.target.value)}
                                placeholder="No default address"
                              />
                            </div>
                            <div className="flex gap-2 sm:col-span-2">
                              <Button
                                size="sm"
                                onClick={handleSaveEditProgram}
                                disabled={!editProgramName.trim() || isProgramSubmitting}
                              >
                                {isProgramSubmitting && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingProgramId(null)}
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
                                onClick={() =>
                                  handleStartEditProgram(program.id, program.name, program.address)
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteProgram(program.id)}
                                disabled={isProgramSubmitting}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Invite Users tab ── */}
          <TabsContent value="invite" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />Invite New User
                </CardTitle>
                <CardDescription>
                  Enter the email address of the person you want to invite. They will receive an
                  email with a link to set their password and access the application.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-sm space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleInviteUser()}
                    />
                  </div>
                  <Button
                    onClick={handleInviteUser}
                    disabled={isInviting || !inviteEmail.trim()}
                    className="w-full"
                  >
                    {isInviting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Send Invitation
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    The invited user will receive an email with a link to create their password. The
                    link expires in 24 hours.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
