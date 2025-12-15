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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, LogOut, User as UserIcon, QrCode, Copy, Download, Share2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { AffiliateBusinessCard } from "@/components/AffiliateBusinessCard";
import { ClientProfileCard } from "@/components/ClientProfileCard";

interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
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
  const [claimNotesMap, setClaimNotesMap] = useState<Record<string, ClaimNote[]>>({});
  const [addClaimOpen, setAddClaimOpen] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  
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
      setClaimNotesMap(prev => ({
        ...prev,
        [claimId]: data as unknown as ClaimNote[]
      }));
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Your Referral Code</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/claims?ref=${affiliate.referral_code}`;
                      navigator.clipboard.writeText(shareUrl);
                      toast({ title: "Referral link copied!" });
                    }}
                    className="h-6 px-2"
                    title="Copy referral link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const shareUrl = `${window.location.origin}/claims?ref=${affiliate.referral_code}`;
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: "Submit an Injury Claim",
                            text: "Use my referral link to submit your injury claim",
                            url: shareUrl,
                          });
                        } catch (err) {
                          if ((err as Error).name !== "AbortError") {
                            toast({ title: "Share failed", variant: "destructive" });
                          }
                        }
                      } else {
                        navigator.clipboard.writeText(shareUrl);
                        toast({ title: "Link copied!" });
                      }
                    }}
                    className="h-6 px-2"
                    title="Share referral link"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="h-6 px-2"
                    title="Toggle QR code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showQrCode ? (
                <div className="bg-white p-2 rounded inline-block">
                  <QRCodeSVG
                    value={`${window.location.origin}/claims?ref=${affiliate.referral_code}`}
                    size={80}
                    level="M"
                  />
                </div>
              ) : (
                <code className="text-lg font-bold bg-muted px-2 py-1 rounded">
                  {affiliate.referral_code}
                </code>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Referral Link Card */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Injury Claims Referral Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/claims?ref=${affiliate.referral_code}`}
                className="font-mono text-sm bg-background"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/claims?ref=${affiliate.referral_code}`);
                  toast({ title: "Link copied!" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/claims?ref=${affiliate.referral_code}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: "Submit an Injury Claim",
                        text: "Use my referral link to submit your injury claim",
                        url: shareUrl,
                      });
                    } catch (err) {
                      // User cancelled or share failed
                      if ((err as Error).name !== "AbortError") {
                        toast({ title: "Share failed", variant: "destructive" });
                      }
                    }
                  } else {
                    // Fallback to copy
                    navigator.clipboard.writeText(shareUrl);
                    toast({ title: "Link copied!" });
                  }
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Share Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Share Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this QR code or link with potential clients to submit injury claims
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <QRCodeSVG
                  id="affiliate-qr-code"
                  value={`${window.location.origin}/claims?ref=${affiliate.referral_code}`}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="text-muted-foreground">Your Referral Link</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      value={`${window.location.origin}/claims?ref=${affiliate.referral_code}`}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/claims?ref=${affiliate.referral_code}`);
                        toast({ title: "Link copied to clipboard!" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const svg = document.getElementById("affiliate-qr-code");
                      if (svg) {
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        const img = new Image();
                        img.onload = () => {
                          canvas.width = img.width;
                          canvas.height = img.height;
                          ctx?.drawImage(img, 0, 0);
                          const pngFile = canvas.toDataURL("image/png");
                          const downloadLink = document.createElement("a");
                          downloadLink.download = `referral-qr-${affiliate.referral_code}.png`;
                          downloadLink.href = pngFile;
                          downloadLink.click();
                        };
                        img.src = "data:image/svg+xml;base64," + btoa(svgData);
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  When clients submit a claim through this link, it will automatically be linked to your referral code: <code className="bg-muted px-1 rounded font-bold">{affiliate.referral_code}</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personalized Business Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Your Business Card
            </CardTitle>
            <CardDescription>
              Customize and print your personalized business card to share with clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AffiliateBusinessCard
              affiliateName={affiliate.name}
              referralCode={affiliate.referral_code}
              email={affiliate.email}
              phone={affiliate.phone || undefined}
            />
          </CardContent>
        </Card>

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
              <div className="space-y-4">
                {claims.map((claim) => (
                  <ClientProfileCard
                    key={claim.id}
                    claim={claim}
                    notes={claimNotesMap[claim.id] || []}
                    onStatusChange={handleUpdateStatus}
                    onAddNote={handleAddNoteForClaim}
                    onExpand={fetchClaimNotes}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliatePortal;
