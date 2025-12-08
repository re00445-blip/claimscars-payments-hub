import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ArrowLeft, Edit, Trash2, Eye, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InjuryClaim {
  id: string;
  full_name: string;
  address: string | null;
  phone: string;
  email: string | null;
  accident_date: string;
  injury_area: string;
  at_fault: string;
  attachments: string[];
  status: string;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

const statusOptions = [
  { value: "new", label: "New", color: "default" },
  { value: "in_review", label: "In Review", color: "secondary" },
  { value: "pending_docs", label: "Pending Documents", color: "outline" },
  { value: "submitted", label: "Submitted to Insurance", color: "default" },
  { value: "negotiating", label: "Negotiating", color: "secondary" },
  { value: "settled", label: "Settled", color: "default" },
  { value: "closed", label: "Closed", color: "secondary" },
];

const AdminClaims = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [claims, setClaims] = useState<InjuryClaim[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<InjuryClaim | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewingClaim, setViewingClaim] = useState<InjuryClaim | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    address: "",
    phone: "",
    email: "",
    accident_date: "",
    injury_area: "",
    at_fault: "no",
    status: "new",
    notes: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        checkAdminStatus(session.user.id);
      }
      setLoading(false);
    });
  }, [navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchClaims();
    }
  }, [isAdmin]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    if (!data) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
    
    setIsAdmin(true);
  };

  const fetchClaims = async () => {
    const { data, error } = await supabase
      .from("injury_claims")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching claims:", error);
      toast({
        title: "Error",
        description: "Failed to load claims",
        variant: "destructive",
      });
    } else {
      setClaims(data || []);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      address: "",
      phone: "",
      email: "",
      accident_date: "",
      injury_area: "",
      at_fault: "no",
      status: "new",
      notes: "",
    });
    setEditingClaim(null);
  };

  const handleEdit = (claim: InjuryClaim) => {
    setEditingClaim(claim);
    setFormData({
      full_name: claim.full_name,
      address: claim.address || "",
      phone: claim.phone,
      email: claim.email || "",
      accident_date: claim.accident_date,
      injury_area: claim.injury_area,
      at_fault: claim.at_fault,
      status: claim.status,
      notes: claim.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const claimData = {
      full_name: formData.full_name,
      address: formData.address || null,
      phone: formData.phone,
      email: formData.email || null,
      accident_date: formData.accident_date,
      injury_area: formData.injury_area,
      at_fault: formData.at_fault,
      status: formData.status,
      notes: formData.notes || null,
    };

    let error;

    if (editingClaim) {
      const { error: updateError } = await supabase
        .from("injury_claims")
        .update(claimData)
        .eq("id", editingClaim.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("injury_claims")
        .insert(claimData);
      error = insertError;
    }

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingClaim ? "update" : "create"} claim: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Claim ${editingClaim ? "updated" : "created"} successfully`,
      });
      fetchClaims();
      setIsDialogOpen(false);
      resetForm();
    }

    setSaving(false);
  };

  const handleStatusChange = async (claimId: string, newStatus: string) => {
    const { error } = await supabase
      .from("injury_claims")
      .update({ status: newStatus })
      .eq("id", claimId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Status updated",
      });
      fetchClaims();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this claim?")) return;

    const { error } = await supabase
      .from("injury_claims")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete claim",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Claim deleted successfully",
      });
      fetchClaims();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(s => s.value === status);
    return (
      <Badge variant={statusOption?.color as any || "default"}>
        {statusOption?.label || status}
      </Badge>
    );
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Claims Portal</h1>
              <p className="text-muted-foreground mt-1">
                Manage injury claims and track progress
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Claim
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingClaim ? "Edit" : "Add New"} Claim</DialogTitle>
                <DialogDescription>
                  {editingClaim ? "Update claim details" : "Enter the claimant's information"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accident_date">Accident Date *</Label>
                    <Input
                      id="accident_date"
                      type="date"
                      value={formData.accident_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, accident_date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="injury_area">Area of Injury *</Label>
                    <Input
                      id="injury_area"
                      value={formData.injury_area}
                      onChange={(e) => setFormData(prev => ({ ...prev, injury_area: e.target.value }))}
                      placeholder="e.g., Lower back, Neck"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="at_fault">At Fault? *</Label>
                    <Select
                      value={formData.at_fault}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, at_fault: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about the claim..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingClaim ? "Update" : "Create"} Claim
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Claim Details Dialog */}
        <Dialog open={!!viewingClaim} onOpenChange={(open) => !open && setViewingClaim(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Claim Details</DialogTitle>
            </DialogHeader>
            {viewingClaim && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{viewingClaim.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{viewingClaim.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{viewingClaim.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Accident Date</Label>
                    <p className="font-medium">{new Date(viewingClaim.accident_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Injury Area</Label>
                    <p className="font-medium">{viewingClaim.injury_area}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">At Fault</Label>
                    <p className="font-medium capitalize">{viewingClaim.at_fault}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">{viewingClaim.address || "N/A"}</p>
                </div>
                {viewingClaim.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="font-medium">{viewingClaim.notes}</p>
                  </div>
                )}
                {viewingClaim.attachments && viewingClaim.attachments.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Attachments</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {viewingClaim.attachments.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Attachment {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>All Claims</CardTitle>
            <CardDescription>Track and manage injury claims</CardDescription>
          </CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No claims found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Accident Date</TableHead>
                      <TableHead>Injury</TableHead>
                      <TableHead>At Fault</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.full_name}</TableCell>
                        <TableCell>{claim.phone}</TableCell>
                        <TableCell>{new Date(claim.accident_date).toLocaleDateString()}</TableCell>
                        <TableCell>{claim.injury_area}</TableCell>
                        <TableCell className="capitalize">{claim.at_fault}</TableCell>
                        <TableCell>
                          <Select
                            value={claim.status}
                            onValueChange={(value) => handleStatusChange(claim.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{new Date(claim.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setViewingClaim(claim)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(claim)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(claim.id)}>
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

export default AdminClaims;