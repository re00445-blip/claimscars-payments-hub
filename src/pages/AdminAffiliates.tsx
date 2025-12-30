import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Users, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  flat_fee: number;
  referral_code: string;
  total_referrals: number;
  total_earnings: number;
  contracts_sent: number;
  contracts_signed: number;
  status: string;
  created_at: string;
}

const AdminAffiliates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    flat_fee: "250",
    contracts_sent: "0",
    contracts_signed: "0",
  });

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await fetchAffiliates();
    setLoading(false);
  };

  const fetchAffiliates = async () => {
    const { data, error } = await supabase
      .from("marketing_affiliates" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching affiliates:", error);
      return;
    }

    setAffiliates((data as unknown as Affiliate[]) || []);
  };

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingAffiliate) {
      const { error } = await supabase
        .from("marketing_affiliates" as any)
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          flat_fee: parseFloat(formData.flat_fee),
          contracts_sent: parseInt(formData.contracts_sent),
          contracts_signed: parseInt(formData.contracts_signed),
        })
        .eq("id", editingAffiliate.id);

      if (error) {
        toast({ title: "Error updating affiliate", variant: "destructive" });
        return;
      }

      toast({ title: "Affiliate updated successfully" });
    } else {
      const { error } = await supabase
        .from("marketing_affiliates" as any)
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          flat_fee: parseFloat(formData.flat_fee),
          referral_code: generateReferralCode(),
          contracts_sent: parseInt(formData.contracts_sent),
          contracts_signed: parseInt(formData.contracts_signed),
        });

      if (error) {
        toast({ title: "Error creating affiliate", variant: "destructive" });
        return;
      }

      toast({ title: "Affiliate created successfully" });
    }

    setDialogOpen(false);
    setEditingAffiliate(null);
    setFormData({ name: "", email: "", phone: "", flat_fee: "250", contracts_sent: "0", contracts_signed: "0" });
    fetchAffiliates();
  };

  const handleEdit = (affiliate: Affiliate) => {
    setEditingAffiliate(affiliate);
    setFormData({
      name: affiliate.name,
      email: affiliate.email,
      phone: affiliate.phone || "",
      flat_fee: affiliate.flat_fee.toString(),
      contracts_sent: affiliate.contracts_sent.toString(),
      contracts_signed: affiliate.contracts_signed.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this affiliate?")) return;

    const { error } = await supabase
      .from("marketing_affiliates" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting affiliate", variant: "destructive" });
      return;
    }

    toast({ title: "Affiliate deleted successfully" });
    fetchAffiliates();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Marketing Affiliates
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage affiliate partners and track referrals
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingAffiliate(null);
              setFormData({ name: "", email: "", phone: "", flat_fee: "250", contracts_sent: "0", contracts_signed: "0" });
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Affiliate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAffiliate ? "Edit Affiliate" : "Add New Affiliate"}</DialogTitle>
                <DialogDescription>
                  {editingAffiliate ? "Update affiliate information" : "Create a new marketing affiliate partner"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="flat_fee">Flat Fee ($)</Label>
                  <Input
                    id="flat_fee"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.flat_fee}
                    onChange={(e) => setFormData({ ...formData, flat_fee: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contracts_sent">Contracts Sent</Label>
                    <Input
                      id="contracts_sent"
                      type="number"
                      min="0"
                      value={formData.contracts_sent}
                      onChange={(e) => setFormData({ ...formData, contracts_sent: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contracts_signed">Contracts Signed</Label>
                    <Input
                      id="contracts_signed"
                      type="number"
                      min="0"
                      value={formData.contracts_signed}
                      onChange={(e) => setFormData({ ...formData, contracts_signed: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingAffiliate ? "Update Affiliate" : "Create Affiliate"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Affiliates</CardTitle>
            <CardDescription>
              {affiliates.length} affiliate{affiliates.length !== 1 ? "s" : ""} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {affiliates.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No affiliates yet. Add your first affiliate partner.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Referral Code</TableHead>
                      <TableHead>Flat Fee</TableHead>
                      <TableHead>Cases</TableHead>
                      <TableHead>Contracts Sent</TableHead>
                      <TableHead>Contracts Signed</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((affiliate) => (
                      <TableRow key={affiliate.id}>
                        <TableCell className="font-medium">{affiliate.name}</TableCell>
                        <TableCell>{affiliate.email}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {affiliate.referral_code}
                          </code>
                        </TableCell>
                        <TableCell>${affiliate.flat_fee.toFixed(2)}</TableCell>
                        <TableCell>{affiliate.total_referrals}</TableCell>
                        <TableCell>{affiliate.contracts_sent}</TableCell>
                        <TableCell>{affiliate.contracts_signed}</TableCell>
                        <TableCell>${affiliate.total_earnings.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            affiliate.status === "active" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {affiliate.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(affiliate)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(affiliate.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAffiliates;
