import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, FileText, MessageSquare, LogOut, User as UserIcon, Calendar, Phone, Mail, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Affiliate {
  id: string;
  name: string;
  email: string;
  commission_rate: number;
  referral_code: string;
  total_referrals: number;
  total_earnings: number;
  contracts_sent: number;
  contracts_signed: number;
}

interface Claim {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  accident_date: string;
  injury_area: string;
  at_fault: string;
  status: string;
  notes: string | null;
  agreement_amount: number | null;
  created_at: string;
  updated_at: string;
}

interface ClaimNote {
  id: string;
  claim_id: string;
  note: string;
  created_at: string;
}

const AffiliatePortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimNotes, setClaimNotes] = useState<ClaimNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addClaimOpen, setAddClaimOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  
  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  // New claim form state
  const [claimForm, setClaimForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    accident_date: "",
    injury_area: "",
    at_fault: "no",
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAffiliateStatus(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAffiliateStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAffiliateStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from("marketing_affiliates" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (data) {
      setAffiliate(data as unknown as Affiliate);
      await fetchClaims((data as any).id);
    }
    setLoading(false);
  };

  const fetchClaims = async (affiliateId: string) => {
    const { data, error } = await supabase
      .from("injury_claims")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false });

    if (data) {
      setClaims(data as Claim[]);
    }
  };

  const fetchClaimNotes = async (claimId: string) => {
    const { data } = await supabase
      .from("affiliate_notes" as any)
      .select("*")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: false });

    if (data) {
      setClaimNotes(data as unknown as ClaimNote[]);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
    setLoginLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAffiliate(null);
    setClaims([]);
    window.location.href = "/affiliate";
  };

  const handleAddClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliate) return;

    const { error } = await supabase
      .from("injury_claims")
      .insert({
        ...claimForm,
        affiliate_id: affiliate.id,
        referral_source: affiliate.referral_code,
      });

    if (error) {
      toast({ title: "Error adding claim", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Claim added successfully" });
    setAddClaimOpen(false);
    setClaimForm({
      full_name: "",
      phone: "",
      email: "",
      address: "",
      accident_date: "",
      injury_area: "",
      at_fault: "no",
    });
    fetchClaims(affiliate.id);
  };

  const handleUpdateStatus = async (claimId: string, newStatus: string) => {
    const { error } = await supabase
      .from("injury_claims")
      .update({ status: newStatus })
      .eq("id", claimId);

    if (error) {
      toast({ title: "Error updating status", variant: "destructive" });
      return;
    }

    toast({ title: "Status updated" });
    if (affiliate) fetchClaims(affiliate.id);
  };

  const handleAddNote = async () => {
    if (!selectedClaim || !affiliate || !newNote.trim()) return;

    const { error } = await supabase
      .from("affiliate_notes" as any)
      .insert({
        claim_id: selectedClaim.id,
        affiliate_id: affiliate.id,
        note: newNote.trim(),
      });

    if (error) {
      toast({ title: "Error adding note", variant: "destructive" });
      return;
    }

    toast({ title: "Note added" });
    setNewNote("");
    fetchClaimNotes(selectedClaim.id);
  };

  const openNotesDialog = async (claim: Claim) => {
    setSelectedClaim(claim);
    await fetchClaimNotes(claim.id);
    setNotesDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-orange-100 text-orange-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Login screen for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-md px-4 py-16">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Affiliate Portal</CardTitle>
              <CardDescription>Sign in to manage your referred cases</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not an affiliate
  if (!affiliate) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-md px-4 py-16">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Access Denied</CardTitle>
              <CardDescription>
                Your account is not registered as a marketing affiliate.
                Please contact an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleSignOut} variant="outline" className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserIcon className="h-8 w-8" />
              Affiliate Portal
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {affiliate.name}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{claims.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{affiliate.commission_rate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${affiliate.total_earnings.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Referral Code</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-lg font-bold bg-muted px-2 py-1 rounded">
                {affiliate.referral_code}
              </code>
            </CardContent>
          </Card>
        </div>

        {/* Cases, Contracts Sent, Contracts Signed */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{claims.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Linked to: <code className="bg-muted px-1 rounded">{affiliate.referral_code}</code>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Contracts Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{affiliate.contracts_sent}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Linked to: <code className="bg-muted px-1 rounded">{affiliate.referral_code}</code>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Contracts Signed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{affiliate.contracts_signed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Linked to: <code className="bg-muted px-1 rounded">{affiliate.referral_code}</code>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Claims Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>My Referred Cases</CardTitle>
                <CardDescription>
                  Manage and track your personal injury referrals
                </CardDescription>
              </div>
              <Dialog open={addClaimOpen} onOpenChange={setAddClaimOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Claim
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Injury Claim</DialogTitle>
                    <DialogDescription>
                      Enter the details of your new referral
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddClaim} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                          id="full_name"
                          value={claimForm.full_name}
                          onChange={(e) => setClaimForm({ ...claimForm, full_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={claimForm.phone}
                          onChange={(e) => setClaimForm({ ...claimForm, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="claim_email">Email</Label>
                        <Input
                          id="claim_email"
                          type="email"
                          value={claimForm.email}
                          onChange={(e) => setClaimForm({ ...claimForm, email: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={claimForm.address}
                          onChange={(e) => setClaimForm({ ...claimForm, address: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="accident_date">Accident Date *</Label>
                        <Input
                          id="accident_date"
                          type="date"
                          value={claimForm.accident_date}
                          onChange={(e) => setClaimForm({ ...claimForm, accident_date: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="at_fault">At Fault?</Label>
                        <Select
                          value={claimForm.at_fault}
                          onValueChange={(value) => setClaimForm({ ...claimForm, at_fault: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="injury_area">Injury Area *</Label>
                        <Input
                          id="injury_area"
                          value={claimForm.injury_area}
                          onChange={(e) => setClaimForm({ ...claimForm, injury_area: e.target.value })}
                          placeholder="e.g., Neck, Back, Head"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      Submit Claim
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No claims yet. Add your first referral to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Accident Date</TableHead>
                      <TableHead>Injury</TableHead>
                      <TableHead>At Fault</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.full_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {claim.phone}
                            </span>
                            {claim.email && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {claim.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(claim.accident_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{claim.injury_area}</TableCell>
                        <TableCell>
                          <Badge variant={claim.at_fault === "no" ? "default" : "secondary"}>
                            {claim.at_fault}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={claim.status}
                            onValueChange={(value) => handleUpdateStatus(claim.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(claim.status)}`}>
                                {claim.status.replace("_", " ")}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openNotesDialog(claim)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Notes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Dialog */}
        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Case Notes - {selectedClaim?.full_name}</DialogTitle>
              <DialogDescription>
                Track progress and add notes for this case
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Add new note */}
              <div className="space-y-2">
                <Label>Add Note</Label>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter your note..."
                  rows={3}
                />
                <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </div>

              {/* Existing notes */}
              <div className="space-y-2">
                <Label>Previous Notes</Label>
                {claimNotes.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No notes yet for this case.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {claimNotes.map((note) => (
                      <div key={note.id} className="bg-muted p-3 rounded-lg">
                        <p className="text-sm">{note.note}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(note.created_at), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AffiliatePortal;
