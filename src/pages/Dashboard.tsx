import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Loader2, DollarSign, Car, FileText, Users, ClipboardList, Settings, UserPlus, Sparkles, CreditCard, Share2, Plus, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TransactionsReport } from "@/components/admin/TransactionsReport";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserAvatar } from "@/components/UserAvatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientProfileCard } from "@/components/ClientProfileCard";
import { RaceTrackProgress } from "@/components/RaceTrackProgress";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimNotesMap, setClaimNotesMap] = useState<Record<string, ClaimNote[]>>({});
  const [addClaimOpen, setAddClaimOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    accident_date: "",
    injury_area: "",
    at_fault: "no",
  });
  const [quote, setQuote] = useState<string>("");
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [customerAccount, setCustomerAccount] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkUserRoles(session.user.id, session.user.email || "");
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      } else {
        checkUserRoles(session.user.id, session.user.email || "");
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserRoles = async (userId: string, email: string) => {
    // Check admin role
    const { data: adminData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!adminData);

    // Check affiliate role
    const { data: affiliateRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "affiliate")
      .maybeSingle();

    const isAff = !!affiliateRole;
    setIsAffiliate(isAff);

    if (!isAff) {
      setAffiliate(null);
      setClaims([]);
      return;
    }

    // Fetch affiliate data
    const { data: affiliateData } = await supabase
      .from("marketing_affiliates" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (affiliateData) {
      setAffiliate(affiliateData as unknown as Affiliate);
      fetchClaims((affiliateData as any).id);
      return;
    }

    // Affiliate role is enabled but the marketing affiliate profile is missing or not accessible
    setAffiliate(null);
    setClaims([]);
  };

  const fetchClaims = async (affiliateId: string) => {
    const { data } = await supabase
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
      setClaimNotesMap(prev => ({
        ...prev,
        [claimId]: data as unknown as ClaimNote[]
      }));
    }
  };

  const handleAddClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliate) return;

    const { error } = await supabase
      .from("injury_claims")
      .insert({
        ...claimForm,
        affiliate_id: affiliate.id,
        referral_source: affiliate.name,
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

  const handleAddNoteForClaim = async (claimId: string, noteText: string) => {
    if (!affiliate || !noteText.trim()) return;

    const { error } = await supabase
      .from("affiliate_notes" as any)
      .insert({
        claim_id: claimId,
        affiliate_id: affiliate.id,
        note: noteText.trim(),
      });

    if (error) {
      toast({ title: "Error adding note", variant: "destructive" });
      return;
    }

    toast({ title: "Note added" });
    fetchClaimNotes(claimId);
  };

  const handleUpdateClaim = async (claimId: string, updates: Partial<Claim>) => {
    const { error } = await supabase
      .from("injury_claims")
      .update(updates)
      .eq("id", claimId);

    if (error) {
      toast({ title: "Error updating claim", variant: "destructive" });
      return;
    }

    toast({ title: "Client information updated" });
    if (affiliate) fetchClaims(affiliate.id);
  };

  const fetchCustomerAccount = async (userId: string) => {
    const { data } = await supabase
      .from("customer_accounts")
      .select("*, vehicles(*)")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    
    setCustomerAccount(data);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();
    
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const fetchQuote = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      setQuote(data.quote);
    } catch (error) {
      setQuote("Every payment brings you closer to your dreams.");
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      if (!isAdmin && !isAffiliate) {
        fetchCustomerAccount(user.id);
      } else {
        setCustomerAccount(null);
      }
    }
    fetchQuote();
  }, [user?.id, isAdmin, isAffiliate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error("Sign out error:", error);
    }
    // Clear any cached state and redirect
    localStorage.removeItem('sb-kauqfglsnbmshlteegaf-auth-token');
    window.location.href = "/";
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
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <UserAvatar
              userId={user?.id || ""}
              avatarUrl={avatarUrl}
              fullName={user?.user_metadata?.full_name || null}
              size="lg"
              editable={true}
              onAvatarUpdate={setAvatarUrl}
            />
            <div>
              <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
              <p className="text-muted-foreground mt-1">
                {t("dashboard.welcomeBack")} {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            {t("dashboard.signOut")}
          </Button>
        </div>

        {/* Inspirational Quote Card */}
        <Card className="mb-8 bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <Sparkles className="h-8 w-8 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm font-medium mb-2 opacity-90">{t("dashboard.quoteOfDay")}</p>
                {quoteLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-lg italic">{t("dashboard.loadingInspiration")}</span>
                  </div>
                ) : (
                  <p className="text-xl italic font-medium">"{quote}"</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Race Track Progress - only for BHPH customers */}
        {!isAdmin && !isAffiliate && customerAccount && customerAccount.starting_balance > 0 && (
          <Card className="mb-8 border border-border">
            <CardContent className="pt-6">
              <RaceTrackProgress 
                startingBalance={customerAccount.starting_balance || 0}
                currentBalance={customerAccount.current_balance || 0}
              />
            </CardContent>
          </Card>
        )}

        {/* Customer BHPH Account Section - only show for non-admins with accounts */}
        {!isAdmin && !isAffiliate && customerAccount && (
          <Card className="mb-8 border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-primary">{t("dashboard.yourBhphAccount")}</CardTitle>
                  <CardDescription>{t("dashboard.bhphFinancing")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-background rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground mb-1">{t("dashboard.currentBalance")}</p>
                  <p className="text-3xl font-bold text-primary">
                    ${customerAccount.current_balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="bg-background rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground mb-1">{t("dashboard.monthlyPayment")}</p>
                  <p className="text-3xl font-bold">
                    ${customerAccount.payment_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="bg-background rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground mb-1">{t("dashboard.nextPaymentDue")}</p>
                  <p className="text-2xl font-bold">
                    {customerAccount.next_payment_date 
                      ? new Date(customerAccount.next_payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {customerAccount.vehicles && (
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("dashboard.yourVehicle")}</p>
                      <p className="font-semibold">
                        {customerAccount.vehicles.year} {customerAccount.vehicles.make} {customerAccount.vehicles.model}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                size="lg" 
                className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
                onClick={() => navigate("/payments")}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {t("dashboard.makePayment")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Affiliate Dashboard Section */}
        {isAffiliate && !affiliate && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Affiliate Profile Pending</CardTitle>
              <CardDescription>
                Your affiliate role is active, but your marketing affiliate profile isn’t available yet.
                Please contact an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If you were just switched to Affiliate, sign out and sign back in to refresh your dashboard.
              </p>
            </CardContent>
          </Card>
        )}

        {isAffiliate && affiliate && (
          <>
            {/* Affiliate Stats Cards - Row 1 */}
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{claims.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Commission Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{affiliate.commission_rate}%</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    ${affiliate.total_earnings.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Your Referral Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="text-xl font-bold bg-muted px-3 py-1 rounded">
                    {affiliate.referral_code}
                  </code>
                </CardContent>
              </Card>
            </div>

            {/* Cases, Contracts Sent, Contracts Signed - Row 2 */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card className="border-2 border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">{claims.length}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Linked to: <code className="bg-muted px-1 rounded">{affiliate.referral_code}</code>
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-accent/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Contracts Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-accent">{affiliate.contracts_sent}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Linked to: <code className="bg-muted px-1 rounded">{affiliate.referral_code}</code>
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Contracts Signed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">{affiliate.contracts_signed}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Linked to: <code className="bg-muted px-1 rounded">{affiliate.referral_code}</code>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Add New Claim Button */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Referred Cases</h2>
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

            {/* Claims as Expandable Cards */}
            {claims.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No claims yet. Add your first referral to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 mb-8">
                {claims.map((claim) => (
                  <ClientProfileCard
                    key={claim.id}
                    claim={claim}
                    notes={claimNotesMap[claim.id] || []}
                    onStatusChange={handleUpdateStatus}
                    onAddNote={handleAddNoteForClaim}
                    onExpand={fetchClaimNotes}
                    onUpdateClaim={handleUpdateClaim}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Summary Cards for users without BHPH accounts (and not affiliates) */}
        {!isAdmin && !isAffiliate && !customerAccount && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.accountBalance")}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.noActiveAccounts")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.vehicles")}</CardTitle>
                <Car className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.activeVehicles")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.payments")}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.totalPayments")}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isAdmin && (
          <>
            {/* User Management */}
            <Card className="mb-6 border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("dashboard.userManagement")}
                </CardTitle>
                <CardDescription>{t("dashboard.userManagementDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/admin/users")}>
                  <Users className="mr-2 h-4 w-4" />
                  {t("dashboard.manageUsers")}
                </Button>
              </CardContent>
            </Card>

            {/* Vehicle Management */}
            <Card className="mb-6 border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {t("dashboard.vehicleManagement")}
                </CardTitle>
                <CardDescription>{t("dashboard.vehicleManagementDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/admin/vehicles")}>
                  <Car className="mr-2 h-4 w-4" />
                  {t("dashboard.manageVehicles")}
                </Button>
              </CardContent>
            </Card>

            {/* BHPH Account Management */}
            <Card className="mb-6 border-accent/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t("dashboard.bhphAccountManagement")}
                </CardTitle>
                <CardDescription>{t("dashboard.bhphAccountManagementDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/admin/accounts")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("dashboard.addBhphAccount")}
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/accounts")}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t("dashboard.editAccounts")}
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/payments")}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  {t("dashboard.recordPayments")}
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/reports")}>
                  <FileText className="mr-2 h-4 w-4" />
                  {t("dashboard.paymentReports")}
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/reports")}>
                  <Printer className="mr-2 h-4 w-4" />
                  Batch Receipts
                </Button>
              </CardContent>
            </Card>

            {/* Claims Portal Management */}
            <Card className="mb-6 border-secondary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  {t("dashboard.claimsPortal")}
                </CardTitle>
                <CardDescription>{t("dashboard.claimsPortalDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/admin/claims")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("dashboard.addNewClaimUser")}
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/claims")}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  {t("dashboard.trackClaimProgress")}
                </Button>
              </CardContent>
            </Card>

            {/* Marketing Affiliates */}
            <Card className="mb-6 border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Marketing Affiliates
                </CardTitle>
                <CardDescription>Manage affiliate partners and track referrals</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/admin/affiliates")}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Manage Affiliates
                </Button>
              </CardContent>
            </Card>

            {/* Transactions Report */}
            <div className="mb-6">
              <TransactionsReport />
            </div>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
            <CardDescription>{t("dashboard.recentActivityDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">{t("dashboard.noRecentActivity")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;