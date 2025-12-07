import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, CreditCard, History, DollarSign, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

interface CustomerAccount {
  id: string;
  principal_amount: number;
  current_balance: number;
  interest_rate: number;
  payment_amount: number;
  next_payment_date: string;
  late_fee_amount: number;
  status: string;
  payment_frequency: string;
  vehicles: {
    year: number;
    make: string;
    model: string;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  late_fee_paid: number;
  payment_method: string;
  notes: string;
}

const PaymentPortal = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Calculator state
  const [calcPrincipal, setCalcPrincipal] = useState("");
  const [calcRate, setCalcRate] = useState("18");
  const [calcTermMonths, setCalcTermMonths] = useState("36");
  const [calcResult, setCalcResult] = useState<{
    monthlyPayment: number;
    totalInterest: number;
    totalPayment: number;
  } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAccountData();
    }
  }, [user]);

  const fetchAccountData = async () => {
    if (!user) return;

    try {
      // Fetch customer account
      const { data: accountData, error: accountError } = await supabase
        .from("customer_accounts")
        .select(`
          *,
          vehicles (
            year,
            make,
            model
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (accountError) throw accountError;
      setAccount(accountData as CustomerAccount | null);

      if (accountData) {
        // Fetch payment history
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("account_id", accountData.id)
          .order("payment_date", { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData as Payment[] || []);
      }
    } catch (error: any) {
      console.error("Error fetching account data:", error);
      toast.error("Failed to load account data");
    }
  };

  const calculateSimpleInterest = () => {
    const principal = parseFloat(calcPrincipal);
    const annualRate = parseFloat(calcRate) / 100;
    const termMonths = parseInt(calcTermMonths);

    if (isNaN(principal) || isNaN(annualRate) || isNaN(termMonths)) {
      toast.error("Please enter valid numbers");
      return;
    }

    // Simple interest calculation: I = P × r × t
    const termYears = termMonths / 12;
    const totalInterest = principal * annualRate * termYears;
    const totalPayment = principal + totalInterest;
    const monthlyPayment = totalPayment / termMonths;

    setCalcResult({
      monthlyPayment,
      totalInterest,
      totalPayment,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPaymentStatus = () => {
    if (!account) return null;
    const nextPayment = new Date(account.next_payment_date);
    const today = new Date();
    const daysUntil = Math.ceil((nextPayment.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { status: "overdue", label: "Overdue", variant: "destructive" as const, days: Math.abs(daysUntil) };
    } else if (daysUntil <= 7) {
      return { status: "due-soon", label: "Due Soon", variant: "secondary" as const, days: daysUntil };
    }
    return { status: "current", label: "Current", variant: "default" as const, days: daysUntil };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">BHPH Payment Portal</CardTitle>
              <CardDescription>
                Sign in to view your account, make payments, and see your payment history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" onClick={() => navigate("/auth")}>
                Sign In to Continue
              </Button>
              <Separator />
              <div className="text-center text-sm text-muted-foreground">
                Or use our payment calculator below
              </div>
            </CardContent>
          </Card>

          {/* Payment Calculator for non-logged in users */}
          <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Payment Calculator
              </CardTitle>
              <CardDescription>
                Calculate your monthly payments with simple interest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="principal">Vehicle Price ($)</Label>
                  <Input
                    id="principal"
                    type="number"
                    placeholder="15000"
                    value={calcPrincipal}
                    onChange={(e) => setCalcPrincipal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Interest Rate (%)</Label>
                  <Input
                    id="rate"
                    type="number"
                    placeholder="18"
                    value={calcRate}
                    onChange={(e) => setCalcRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term">Term (months)</Label>
                  <Input
                    id="term"
                    type="number"
                    placeholder="36"
                    value={calcTermMonths}
                    onChange={(e) => setCalcTermMonths(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={calculateSimpleInterest} className="w-full">
                Calculate Payment
              </Button>
              {calcResult && (
                <div className="grid md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(calcResult.monthlyPayment)}
                    </div>
                    <div className="text-sm text-muted-foreground">Monthly Payment</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(calcResult.totalInterest)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Interest</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(calcResult.totalPayment)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Payment</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const paymentStatus = getPaymentStatus();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">BHPH Payment Portal</h1>
          <p className="text-muted-foreground">Manage your account and make payments</p>
        </div>

        {!account ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Account</h3>
              <p className="text-muted-foreground">
                You don't have an active BHPH account. Visit our dealership to get started!
              </p>
              <Button className="mt-4" onClick={() => navigate("/inventory")}>
                View Inventory
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="calculator" className="gap-2">
                <Calculator className="h-4 w-4" />
                Calculator
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Account Summary */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Current Balance</CardDescription>
                    <CardTitle className="text-3xl">{formatCurrency(account.current_balance)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Monthly Payment</CardDescription>
                    <CardTitle className="text-3xl">{formatCurrency(account.payment_amount)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Next Payment Due</CardDescription>
                    <CardTitle className="text-xl">{formatDate(account.next_payment_date)}</CardTitle>
                    {paymentStatus && (
                      <Badge variant={paymentStatus.variant} className="mt-1">
                        {paymentStatus.status === "overdue" 
                          ? `${paymentStatus.days} days overdue`
                          : paymentStatus.status === "due-soon"
                          ? `Due in ${paymentStatus.days} days`
                          : `${paymentStatus.days} days until due`
                        }
                      </Badge>
                    )}
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Interest Rate</CardDescription>
                    <CardTitle className="text-3xl">{account.interest_rate}%</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Vehicle Info */}
              {account.vehicles && (
                <Card>
                  <CardHeader>
                    <CardTitle>Vehicle</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">
                      {account.vehicles.year} {account.vehicles.make} {account.vehicles.model}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Original Amount: {formatCurrency(account.principal_amount)}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Make Payment Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Make a Payment
                  </CardTitle>
                  <CardDescription>
                    Contact us to make a payment or visit our location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-muted-foreground mb-2">
                      For online payments or payment arrangements, please contact us:
                    </p>
                    <p className="font-semibold">Cars & Claims</p>
                    <p className="text-sm text-muted-foreground">Visit our dealership for in-person payments</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>View all your past payments</CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No payment history yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Principal</TableHead>
                          <TableHead>Interest</TableHead>
                          <TableHead>Late Fee</TableHead>
                          <TableHead>Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.payment_date)}</TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>{formatCurrency(payment.principal_paid)}</TableCell>
                            <TableCell>{formatCurrency(payment.interest_paid)}</TableCell>
                            <TableCell>
                              {payment.late_fee_paid > 0 
                                ? formatCurrency(payment.late_fee_paid) 
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.payment_method || "Cash"}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calculator">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Payment Calculator
                  </CardTitle>
                  <CardDescription>
                    Calculate payments with simple interest
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="calc-principal">Vehicle Price ($)</Label>
                      <Input
                        id="calc-principal"
                        type="number"
                        placeholder="15000"
                        value={calcPrincipal}
                        onChange={(e) => setCalcPrincipal(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="calc-rate">Interest Rate (%)</Label>
                      <Input
                        id="calc-rate"
                        type="number"
                        placeholder="18"
                        value={calcRate}
                        onChange={(e) => setCalcRate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="calc-term">Term (months)</Label>
                      <Input
                        id="calc-term"
                        type="number"
                        placeholder="36"
                        value={calcTermMonths}
                        onChange={(e) => setCalcTermMonths(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateSimpleInterest} className="w-full">
                    Calculate Payment
                  </Button>
                  {calcResult && (
                    <div className="grid md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(calcResult.monthlyPayment)}
                        </div>
                        <div className="text-sm text-muted-foreground">Monthly Payment</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {formatCurrency(calcResult.totalInterest)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Interest</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {formatCurrency(calcResult.totalPayment)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Payment</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default PaymentPortal;
