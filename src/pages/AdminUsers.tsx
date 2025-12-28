import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navbar } from "@/components/Navbar";
import { Loader2, ArrowLeft, Shield, User, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
  isAdmin: boolean;
  isAffiliate: boolean;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: adminCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminCheck) {
      navigate("/dashboard");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      return;
    }

    // Only allow delete for super admin
    if (session.user.email === "ramon@carsandclaims.com") {
      setCanDelete(true);
    }

    await loadUsers();
  };

  const loadUsers = async () => {
    setLoading(true);
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Get all roles
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const adminUserIds = new Set(userRoles?.filter(r => r.role === "admin").map(r => r.user_id) || []);
    const affiliateUserIds = new Set(userRoles?.filter(r => r.role === "affiliate").map(r => r.user_id) || []);

    const usersWithRoles: UserProfile[] = (profiles || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      created_at: profile.created_at,
      isAdmin: adminUserIds.has(profile.id),
      isAffiliate: affiliateUserIds.has(profile.id),
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const toggleRole = async (userId: string, role: "admin" | "affiliate", currentlyHasRole: boolean) => {
    setTogglingUserId(userId);
    const user = users.find(u => u.id === userId);

    try {
      if (currentlyHasRole) {
        // Remove role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);

        if (error) throw error;

        // If removing affiliate role, also remove from marketing_affiliates
        if (role === "affiliate" && user) {
          // Prefer user_id linkage, fallback to email
          await supabase.from("marketing_affiliates").delete().eq("user_id", userId);
          await supabase.from("marketing_affiliates").delete().eq("email", user.email);
        }

        toast({
          title: "Role Updated",
          description: `${role === "admin" ? "Admin" : "Affiliate"} privileges removed.`,
        });
      } else {
        // Add role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });

        if (error) throw error;

        // If adding affiliate role, also create marketing_affiliates record
        if (role === "affiliate" && user) {
          const referralCode = `REF-${user.email.split("@")[0].toUpperCase().slice(0, 6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

          // Find an existing affiliate profile (by user_id first, then email)
          const { data: existingByUserId } = await supabase
            .from("marketing_affiliates")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          const { data: existingByEmail } = existingByUserId
            ? { data: null }
            : await supabase
                .from("marketing_affiliates")
                .select("id")
                .eq("email", user.email)
                .maybeSingle();

          const existingAffiliate = existingByUserId || existingByEmail;

          if (existingAffiliate) {
            const { error: linkError } = await supabase
              .from("marketing_affiliates")
              .update({
                user_id: userId,
                name: user.full_name || user.email.split("@")[0],
                phone: user.phone,
                status: "active",
              })
              .eq("id", existingAffiliate.id);

            if (linkError) {
              console.error("Error linking affiliate record:", linkError);
              toast({
                title: "Warning",
                description: "Affiliate role granted, but profile linking failed. Please review in Affiliates page.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Affiliate Linked",
                description: `Marketing affiliate profile linked for ${user.full_name || user.email}`,
              });
            }
          } else {
            const { error: affiliateError } = await supabase
              .from("marketing_affiliates")
              .insert({
                user_id: userId,
                name: user.full_name || user.email.split("@")[0],
                email: user.email,
                phone: user.phone,
                referral_code: referralCode,
                commission_rate: 10,
                status: "active",
                contracts_sent: 0,
                contracts_signed: 0,
              });

            if (affiliateError) {
              console.error("Error creating affiliate record:", affiliateError);
              toast({
                title: "Warning",
                description: "Affiliate role granted, but profile creation failed. Please create manually in Affiliates page.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Affiliate Created",
                description: `Marketing affiliate profile created for ${user.full_name || user.email}`,
              });
            }
          }
        }

        toast({
          title: "Role Updated",
          description: `${role === "admin" ? "Admin" : "Affiliate"} privileges granted.`,
        });
      }

      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        if (role === "admin") return { ...u, isAdmin: !currentlyHasRole };
        return { ...u, isAffiliate: !currentlyHasRole };
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role.",
        variant: "destructive",
      });
    } finally {
      setTogglingUserId(null);
    }
  };

  const deleteUser = async (user: UserProfile) => {
    setDeletingUserId(user.id);

    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId: user.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to delete user");

      setUsers((prev) => prev.filter((u) => u.id !== user.id));

      toast({
        title: "User Deleted",
        description: `${user.full_name || user.email} has been removed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
      setUserToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage user accounts and permissions</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              All Users
            </CardTitle>
            <CardDescription>
              Toggle admin access for each user account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead className="text-center">Affiliate</TableHead>
                    {canDelete && <TableHead className="text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.isAdmin ? (
                            <Shield className="h-4 w-4 text-primary" />
                          ) : user.isAffiliate ? (
                            <Users className="h-4 w-4 text-blue-500" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">
                            {user.full_name || "No name"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || "—"}</TableCell>
                      <TableCell>
                        {user.created_at 
                          ? new Date(user.created_at).toLocaleDateString()
                          : "—"
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {togglingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Switch
                              checked={user.isAdmin}
                              onCheckedChange={() => toggleRole(user.id, "admin", user.isAdmin)}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {togglingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Switch
                              checked={user.isAffiliate}
                              onCheckedChange={() => toggleRole(user.id, "affiliate", user.isAffiliate)}
                            />
                          )}
                        </div>
                      </TableCell>
                      {canDelete && (
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setUserToDelete(user)}
                            disabled={deletingUserId === user.id}
                          >
                            {deletingUserId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.full_name || userToDelete?.email}</strong>? 
              This will remove their profile, roles, and any affiliate records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => userToDelete && deleteUser(userToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;