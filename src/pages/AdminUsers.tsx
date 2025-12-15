import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navbar } from "@/components/Navbar";
import { Loader2, ArrowLeft, Shield, User, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

    try {
      if (currentlyHasRole) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);

        if (error) throw error;

        toast({
          title: "Role Updated",
          description: `${role === "admin" ? "Admin" : "Affiliate"} privileges removed.`,
        });
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });

        if (error) throw error;

        toast({
          title: "Role Updated",
          description: `${role === "admin" ? "Admin" : "Affiliate"} privileges granted.`,
        });
      }

      // Update local state
      setUsers(prev => prev.map(user => {
        if (user.id !== userId) return user;
        if (role === "admin") return { ...user, isAdmin: !currentlyHasRole };
        return { ...user, isAffiliate: !currentlyHasRole };
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;