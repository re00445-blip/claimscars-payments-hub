import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
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
import { Loader2, ArrowLeft, Search, Calendar, DollarSign, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CustomerAccount {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  principal_amount: number;
  current_balance: number;
  profile?: {
    full_name: string | null;
    email: string;
    phone: string | null;
  };
  vehicle?: {
    year: number;
    make: string;
    model: string;
  };
}

interface Payment {
  id: string;
  account_id: string;
  amount: number;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  late_fee_paid: number | null;
  created_by: string | null;
  notes: string | null;
  payment_method: string | null;
  entry_type: string;
  waived_interest: number | null;
  waived_late_fees: number | null;
}

const AdminPaymentHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setTimeout(() => {
            checkAdminStatus(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        checkAdminStatus(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterPayments();
  }, [payments, selectedAccountId, searchTerm, dateFrom, dateTo, accounts]);

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

  const fetchData = async () => {
    // Fetch accounts with profiles and vehicles
    const { data: accountsData } = await supabase
      .from("customer_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (accountsData) {
      const accountsWithDetails = await Promise.all(
        accountsData.map(async (account) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("id", account.user_id)
            .maybeSingle();
          
          let vehicle = null;
          if (account.vehicle_id) {
            const { data: vehicleData } = await supabase
              .from("vehicles")
              .select("year, make, model")
              .eq("id", account.vehicle_id)
              .maybeSingle();
            vehicle = vehicleData;
          }
          
          return { ...account, profile, vehicle };
        })
      );
      setAccounts(accountsWithDetails);
    }

    // Fetch all payments
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("*")
      .order("payment_date", { ascending: false });

    if (paymentsData) {
      setPayments(paymentsData);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Filter by account
    if (selectedAccountId !== "all") {
      filtered = filtered.filter(p => p.account_id === selectedAccountId);
    }

    // Filter by search term (customer name or notes)
    if (searchTerm) {
      filtered = filtered.filter(p => {
        const account = accounts.find(a => a.id === p.account_id);
        const customerName = account?.profile?.full_name?.toLowerCase() || "";
        const notes = p.notes?.toLowerCase() || "";
        return customerName.includes(searchTerm.toLowerCase()) || notes.includes(searchTerm.toLowerCase());
      });
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(p => new Date(p.payment_date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(p => new Date(p.payment_date) <= new Date(dateTo + 'T23:59:59'));
    }

    setFilteredPayments(filtered);
  };

  const getAccountDisplay = (accountId: string): { customerName: string; vehicleInfo: string } => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return { customerName: "Unknown", vehicleInfo: "Unknown" };
    
    const customerName = account.profile?.full_name || account.profile?.email || "Unknown";
    const vehicleInfo = account.vehicle 
      ? `${account.vehicle.year} ${account.vehicle.make} ${account.vehicle.model}` 
      : "No vehicle";
    return { customerName, vehicleInfo };
  };

  const getTotalStats = () => {
    const total = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const principal = filteredPayments.reduce((sum, p) => sum + p.principal_paid, 0);
    const interest = filteredPayments.reduce((sum, p) => sum + p.interest_paid, 0);
    const lateFees = filteredPayments.reduce((sum, p) => sum + (p.late_fee_paid || 0), 0);
    return { total, principal, interest, lateFees, count: filteredPayments.length };
  };

  // Calculate previous balance for each payment
  // For each account, work backwards from current_balance through payments sorted by date
  const paymentBalanceMap = new Map<string, number>();
  (() => {
    // Group all payments by account_id, sorted newest first
    const paymentsByAccount = new Map<string, Payment[]>();
    for (const p of [...payments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())) {
      if (!paymentsByAccount.has(p.account_id)) paymentsByAccount.set(p.account_id, []);
      paymentsByAccount.get(p.account_id)!.push(p);
    }
    // For each account, reconstruct balances
    for (const [accountId, acctPayments] of paymentsByAccount) {
      const account = accounts.find(a => a.id === accountId);
      let runningBalance = account?.current_balance ?? 0;
      for (const p of acctPayments) {
        const prevBalance = runningBalance + p.amount;
        paymentBalanceMap.set(p.id, prevBalance);
        runningBalance = prevBalance;
      }
    }
  })();

  const stats = getTotalStats();

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
            <Button variant="ghost" onClick={() => navigate("/admin/payments")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Payment History</h1>
              <p className="text-muted-foreground mt-1">
                View and filter all BHPH payment records
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">${stats.total.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Principal Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${stats.principal.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Interest Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">${stats.interest.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Late Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">${stats.lateFees.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filter Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Customer Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((account) => {
                      const { customerName, vehicleInfo } = getAccountDisplay(account.id);
                      return (
                        <SelectItem key={account.id} value={account.id}>
                          {customerName} - {vehicleInfo}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Customer name or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            {(selectedAccountId !== "all" || searchTerm || dateFrom || dateTo) && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedAccountId("all");
                    setSearchTerm("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
            <CardDescription>
              Showing {filteredPayments.length} of {payments.length} payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payments found matching your filters
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Late Fees</TableHead>
                    <TableHead className="text-right">Prev Balance</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredPayments.flatMap((payment) => {
                    const { customerName, vehicleInfo } = getAccountDisplay(payment.account_id);
                    const rows = [
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {customerName}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {vehicleInfo}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          ${payment.principal_paid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          ${payment.interest_paid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          ${(payment.late_fee_paid || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(paymentBalanceMap.get(payment.id) ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.entry_type === 'automatic' ? 'default' : 'secondary'}>
                            {payment.entry_type === 'automatic' ? 'Auto' : 'Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.payment_method || "Cash"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {payment.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ];
                    if ((payment.waived_interest || 0) > 0) {
                      rows.push(
                        <TableRow key={`${payment.id}-waived-int`} className="bg-orange-50 dark:bg-orange-950/20 border-0">
                          <TableCell className="pl-8 text-orange-600 text-xs font-medium" colSpan={3}>
                            ↳ Interest Waived
                          </TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">
                            -${(payment.waived_interest || 0).toLocaleString()}
                          </TableCell>
                          <TableCell colSpan={7} className="text-orange-600 text-xs">
                            Applied on {new Date(payment.payment_date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    }
                    if ((payment.waived_late_fees || 0) > 0) {
                      rows.push(
                        <TableRow key={`${payment.id}-waived-fees`} className="bg-orange-50 dark:bg-orange-950/20 border-0">
                          <TableCell className="pl-8 text-orange-600 text-xs font-medium" colSpan={3}>
                            ↳ Late Fees Waived
                          </TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">
                            -${(payment.waived_late_fees || 0).toLocaleString()}
                          </TableCell>
                          <TableCell colSpan={7} className="text-orange-600 text-xs">
                            Applied on {new Date(payment.payment_date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    }
                    return rows;
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPaymentHistory;
