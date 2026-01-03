import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, Eye, EyeOff, Key } from "lucide-react";

interface Password {
  id: string;
  account: string;
  login: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export const PasswordsManager = () => {
  const { toast } = useToast();
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [newEntry, setNewEntry] = useState({ account: "", login: "", password: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    checkPermissionsAndLoad();
  }, []);

  const checkPermissionsAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.email === "ramon@carsandclaims.com") {
      setCanEdit(true);
    }

    await loadPasswords();
  };

  const loadPasswords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("passwords")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load passwords.",
        variant: "destructive",
      });
    } else {
      setPasswords(data || []);
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string, field: keyof Password, value: string) => {
    setPasswords(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const savePassword = async (password: Password) => {
    setSaving(password.id);
    
    const { error } = await supabase
      .from("passwords")
      .update({
        account: password.account,
        login: password.login,
        password: password.password,
      })
      .eq("id", password.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save password.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Saved",
        description: "Password entry updated successfully.",
      });
    }
    setSaving(null);
  };

  const addPassword = async () => {
    if (!newEntry.account || !newEntry.login || !newEntry.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    
    const { data, error } = await supabase
      .from("passwords")
      .insert({
        account: newEntry.account,
        login: newEntry.login,
        password: newEntry.password,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add password.",
        variant: "destructive",
      });
    } else {
      setPasswords(prev => [...prev, data]);
      setNewEntry({ account: "", login: "", password: "" });
      toast({
        title: "Added",
        description: "New password entry created.",
      });
    }
    setAdding(false);
  };

  const deletePassword = async (id: string) => {
    const { error } = await supabase
      .from("passwords")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete password.",
        variant: "destructive",
      });
    } else {
      setPasswords(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Deleted",
        description: "Password entry removed.",
      });
    }
  };

  const toggleShowPassword = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Password Manager
        </CardTitle>
        <CardDescription>
          Securely store and manage account credentials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Password</TableHead>
              {canEdit && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {passwords.map((password) => (
              <TableRow key={password.id}>
                <TableCell>
                  {canEdit ? (
                    <Input
                      value={password.account}
                      onChange={(e) => handleUpdate(password.id, "account", e.target.value)}
                    />
                  ) : (
                    password.account
                  )}
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Input
                      value={password.login}
                      onChange={(e) => handleUpdate(password.id, "login", e.target.value)}
                    />
                  ) : (
                    password.login
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <Input
                        type={showPassword[password.id] ? "text" : "password"}
                        value={password.password}
                        onChange={(e) => handleUpdate(password.id, "password", e.target.value)}
                      />
                    ) : (
                      <span className="font-mono">
                        {showPassword[password.id] ? password.password : "••••••••"}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleShowPassword(password.id)}
                    >
                      {showPassword[password.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => savePassword(password)}
                        disabled={saving === password.id}
                      >
                        {saving === password.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deletePassword(password.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {canEdit && (
              <TableRow>
                <TableCell>
                  <Input
                    placeholder="Account name"
                    value={newEntry.account}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, account: e.target.value }))}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Login/Username"
                    value={newEntry.login}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, login: e.target.value }))}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newEntry.password}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, password: e.target.value }))}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={addPassword}
                      disabled={adding}
                    >
                      {adding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {passwords.length === 0 && !canEdit && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No passwords stored yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
