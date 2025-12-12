import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, CreditCard, History, DollarSign, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import { PaymentMethodsSection } from "@/components/PaymentMethodsSection";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Check for payment success/cancel from Stripe redirect
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const sessionId = searchParams.get("session_id");
    
    if (success === "true" && sessionId) {
      // Verify the payment and record it
      const verifyPayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke("verify-stripe-payment", {
            body: { sessionId },
          });
          
          if (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment received but verification pending. Please contact us if your balance doesn't update.");
          } else if (data?.alreadyRecorded) {
            toast.info("This payment was already recorded.");
          } else {
            toast.success("Payment successful! Receipt sent to your email.");
            // Refresh account data to show updated balance
            fetchAccountData();
          }
        } catch (err) {
          console.error("Payment verification error:", err);
          toast.error("Payment received but verification pending.");
        }
        
        setShowSuccessMessage(true);
        // Clear the URL params
        window.history.replaceState({}, "", "/payments");
      };
      
      verifyPayment();
    } else if (success === "true") {
      setShowSuccessMessage(true);
      toast.success("Payment initiated successfully!");
      window.history.replaceState({}, "", "/payments");
    } else if (canceled === "true") {
      toast.info("Payment was canceled");
      window.history.replaceState({}, "", "/payments");
    }
  }, [searchParams]);
  
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
          <div className="animate-pulse text-muted-foreground">{t("portal.loading")}</div>
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
              <CardTitle className="text-2xl">{t("portal.title")}</CardTitle>
              <CardDescription>
                {t("portal.signInDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" onClick={() => navigate("/auth")}>
                {t("portal.signIn")}
              </Button>
              <Separator />
              <div className="text-center text-sm text-muted-foreground">
                {t("portal.useCalculator")}
              </div>
            </CardContent>
          </Card>

          <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {t("portal.paymentCalculator")}
              </CardTitle>
              <CardDescription>
                {t("portal.calcDescAlt")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="principal">{t("portal.vehiclePrice")}</Label>
                  <Input
                    id="principal"
                    type="number"
                    placeholder="15000"
                    value={calcPrincipal}
                    onChange={(e) => setCalcPrincipal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">{t("portal.interestRate")}</Label>
                  <Input
                    id="rate"
                    type="number"
                    placeholder="18"
                    value={calcRate}
                    onChange={(e) => setCalcRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term">{t("portal.termMonths")}</Label>
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
                {t("portal.calculatePayment")}
              </Button>
              {calcResult && (
                <div className="grid md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(calcResult.monthlyPayment)}
                    </div>
                    <div className="text-sm text-muted-foreground">{t("portal.monthlyPayment")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(calcResult.totalInterest)}
                    </div>
                    <div className="text-sm text-muted-foreground">{t("portal.totalInterest")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(calcResult.totalPayment)}
                    </div>
                    <div className="text-sm text-muted-foreground">{t("portal.totalPayment")}</div>
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
          <h1 className="text-3xl font-bold">{t("portal.title")}</h1>
          <p className="text-muted-foreground">{t("portal.subtitle")}</p>
        </div>

        {!account ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("portal.noActiveAccount")}</h3>
              <p className="text-muted-foreground">
                {t("portal.noActiveAccountDesc")}
              </p>
              <Button className="mt-4" onClick={() => navigate("/inventory")}>
                {t("portal.viewInventory")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview" className="gap-2">
                <DollarSign className="h-4 w-4" />
                {t("portal.overview")}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                {t("portal.history")}
              </TabsTrigger>
              <TabsTrigger value="calculator" className="gap-2">
                <Calculator className="h-4 w-4" />
                {t("portal.calculator")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Account Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t("portal.currentBalance")}</CardDescription>
                    <CardTitle className="text-3xl">{formatCurrency(account.current_balance)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t("portal.monthlyPayment")}</CardDescription>
                    <CardTitle className="text-3xl">{formatCurrency(account.payment_amount)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t("portal.nextPaymentDue")}</CardDescription>
                    <CardTitle className="text-xl">{formatDate(account.next_payment_date)}</CardTitle>
                    {paymentStatus && (
                      <Badge variant={paymentStatus.variant} className="mt-1">
                        {paymentStatus.status === "overdue" 
                          ? t("portal.daysOverdue").replace("{days}", String(paymentStatus.days))
                          : paymentStatus.status === "due-soon"
                          ? t("portal.dueInDays").replace("{days}", String(paymentStatus.days))
                          : t("portal.daysUntilDue").replace("{days}", String(paymentStatus.days))
                        }
                      </Badge>
                    )}
                  </CardHeader>
                </Card>
              </div>

              {/* Vehicle Info */}
              {account.vehicles && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("portal.vehicle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">
                      {account.vehicles.year} {account.vehicles.make} {account.vehicles.model}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {t("portal.originalAmount")}: {formatCurrency(account.principal_amount)}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Success Message */}
              {showSuccessMessage && (
                <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="py-4 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">{t("portal.paymentInitiated")}</p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {t("portal.paymentProcessing")}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-auto"
                      onClick={() => setShowSuccessMessage(false)}
                    >
                      {t("portal.dismiss")}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Make Payment Section */}
              <PaymentMethodsSection
                accountId={account.id}
                currentBalance={account.current_balance}
                paymentAmount={account.payment_amount}
                onPaymentSuccess={fetchAccountData}
              />
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>{t("portal.paymentHistory")}</CardTitle>
                  <CardDescription>{t("portal.viewPastPayments")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("portal.noPaymentHistory")}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("portal.date")}</TableHead>
                          <TableHead>{t("portal.amount")}</TableHead>
                          <TableHead>{t("portal.principal")}</TableHead>
                          <TableHead>{t("portal.interest")}</TableHead>
                          <TableHead>{t("portal.lateFee")}</TableHead>
                          <TableHead>{t("portal.method")}</TableHead>
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
                    {t("portal.paymentCalculator")}
                  </CardTitle>
                  <CardDescription>
                    {t("portal.calcDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="calc-principal">{t("portal.vehiclePrice")}</Label>
                      <Input
                        id="calc-principal"
                        type="number"
                        placeholder="15000"
                        value={calcPrincipal}
                        onChange={(e) => setCalcPrincipal(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="calc-rate">{t("portal.interestRate")}</Label>
                      <Input
                        id="calc-rate"
                        type="number"
                        placeholder="18"
                        value={calcRate}
                        onChange={(e) => setCalcRate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="calc-term">{t("portal.termMonths")}</Label>
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
                    {t("portal.calculatePayment")}
                  </Button>
                  {calcResult && (
                    <div className="grid md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(calcResult.monthlyPayment)}
                        </div>
                        <div className="text-sm text-muted-foreground">{t("portal.monthlyPayment")}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {formatCurrency(calcResult.totalInterest)}
                        </div>
                        <div className="text-sm text-muted-foreground">{t("portal.totalInterest")}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {formatCurrency(calcResult.totalPayment)}
                        </div>
                        <div className="text-sm text-muted-foreground">{t("portal.totalPayment")}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default PaymentPortal;
