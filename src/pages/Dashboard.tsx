import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Loader2, DollarSign, Car, FileText, Users, ClipboardList, Settings, UserPlus, Sparkles, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TransactionsReport } from "@/components/admin/TransactionsReport";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [quote, setQuote] = useState<string>("");
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [customerAccount, setCustomerAccount] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminStatus(session.user.id);
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
        checkAdminStatus(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
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
    if (user?.id && !isAdmin) {
      fetchCustomerAccount(user.id);
    }
    fetchQuote();
  }, [user?.id, isAdmin]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        {/* Inspirational Quote Card */}
        <Card className="mb-8 bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <Sparkles className="h-8 w-8 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm font-medium mb-2 opacity-90">Quote of the Day</p>
                {quoteLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-lg italic">Loading inspiration...</span>
                  </div>
                ) : (
                  <p className="text-xl italic font-medium">"{quote}"</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer BHPH Account Section - only show for non-admins with accounts */}
        {!isAdmin && customerAccount && (
          <Card className="mb-8 border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-primary">Your BHPH Account</CardTitle>
                  <CardDescription>Buy Here Pay Here Financing</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-background rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                  <p className="text-3xl font-bold text-primary">
                    ${customerAccount.current_balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="bg-background rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground mb-1">Monthly Payment</p>
                  <p className="text-3xl font-bold">
                    ${customerAccount.payment_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="bg-background rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground mb-1">Next Payment Due</p>
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
                      <p className="text-sm text-muted-foreground">Your Vehicle</p>
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
                Make a Payment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards for users without BHPH accounts */}
        {!isAdmin && !customerAccount && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground mt-1">No active accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Vehicles</CardTitle>
                <Car className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">Active vehicles</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Payments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">Total payments</p>
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
                  User Management
                </CardTitle>
                <CardDescription>Manage user accounts and admin permissions</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/admin/users")}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
              </CardContent>
            </Card>

            {/* Vehicle Management */}
            <Card className="mb-6 border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicle Management
                </CardTitle>
                <CardDescription>Manage vehicle inventory</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/admin/vehicles")}>
                  <Car className="mr-2 h-4 w-4" />
                  Manage Vehicles
                </Button>
              </CardContent>
            </Card>

            {/* BHPH Account Management */}
            <Card className="mb-6 border-accent/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  BHPH Account Management
                </CardTitle>
                <CardDescription>Add accounts, set interest rates, and manage payments</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/admin/accounts")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add BHPH Account
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/accounts")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Accounts / Interest Rates
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/payments")}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Record Payments
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/reports")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Payment Reports
                </Button>
              </CardContent>
            </Card>

            {/* Claims Portal Management */}
            <Card className="mb-6 border-secondary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Claims Portal
                </CardTitle>
                <CardDescription>Add new claim users and track claim progress</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/admin/claims")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add New Claim User
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/claims")}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Track Claim Progress
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
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your recent transactions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">No recent activity</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
