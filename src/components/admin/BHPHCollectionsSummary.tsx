import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, TrendingUp, AlertCircle, ChevronLeft, ChevronRight, Banknote } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, subDays, subWeeks, subMonths, addDays, addWeeks, addMonths } from "date-fns";

type TimeFilter = "daily" | "weekly" | "monthly" | "yearly";

interface AccountOption {
  id: string;
  customerName: string;
  vehicleInfo: string;
}

interface PaymentDetail {
  id: string;
  account_id: string;
  amount: number;
  principal_paid: number;
  interest_paid: number;
  late_fee_paid: number;
  payment_method: string | null;
  payment_date: string;
  customerName: string;
  vehicleInfo: string;
}

interface CollectionData {
  totalCollected: number;
  totalPrincipal: number;
  totalInterest: number;
  totalLateFees: number;
  paymentCount: number;
}

export const BHPHCollectionsSummary = () => {
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("daily");
  const [showByAccount, setShowByAccount] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);
  const [collectionData, setCollectionData] = useState<CollectionData>({
    totalCollected: 0,
    totalPrincipal: 0,
    totalInterest: 0,
    totalLateFees: 0,
    paymentCount: 0,
  });
  const [accountBreakdown, setAccountBreakdown] = useState<
    Array<{ accountId: string; customerName: string; vehicleInfo: string; collected: number; interest: number; lateFees: number; count: number }>
  >([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [timeFilter, showByAccount, selectedAccountId, referenceDate]);

  const fetchAccounts = async () => {
    // Fetch accounts first
    const { data: accountsData, error: accountsError } = await supabase
      .from("customer_accounts")
      .select("id, user_id, vehicle_id")
      .eq("status", "active");

    if (accountsError || !accountsData) {
      console.error("Error fetching accounts:", accountsError);
      return;
    }

    // Fetch profiles and vehicles separately
    const userIds = [...new Set(accountsData.map(a => a.user_id))];
    const vehicleIds = [...new Set(accountsData.filter(a => a.vehicle_id).map(a => a.vehicle_id))];

    const [profilesRes, vehiclesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", userIds),
      vehicleIds.length > 0 
        ? supabase.from("vehicles").select("id, year, make, model").in("id", vehicleIds)
        : Promise.resolve({ data: [] })
    ]);

    const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
    const vehiclesMap = new Map((vehiclesRes.data || []).map(v => [v.id, v]));

    const accountOptions: AccountOption[] = accountsData.map((acc) => {
      const profile = profilesMap.get(acc.user_id);
      const vehicle = vehiclesMap.get(acc.vehicle_id);
      return {
        id: acc.id,
        customerName: profile?.full_name || "Unknown",
        vehicleInfo: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "No vehicle",
      };
    });
    setAccounts(accountOptions);
  };

  const navigateDate = (direction: -1 | 1) => {
    setReferenceDate(prev => {
      switch (timeFilter) {
        case "daily": return direction === -1 ? subDays(prev, 1) : addDays(prev, 1);
        case "weekly": return direction === -1 ? subWeeks(prev, 1) : addWeeks(prev, 1);
        case "monthly": return direction === -1 ? subMonths(prev, 1) : addMonths(prev, 1);
        case "yearly": return new Date(prev.getFullYear() + direction, 0, 1);
      }
    });
  };

  const getDateRange = () => {
    let startDate: Date;
    let endDate: Date;

    switch (timeFilter) {
      case "daily":
        startDate = startOfDay(referenceDate);
        endDate = endOfDay(referenceDate);
        break;
      case "weekly":
        startDate = startOfWeek(referenceDate, { weekStartsOn: 1 });
        endDate = endOfWeek(referenceDate, { weekStartsOn: 1 });
        break;
      case "monthly":
        startDate = startOfMonth(referenceDate);
        endDate = endOfMonth(referenceDate);
        break;
      case "yearly":
        startDate = startOfYear(referenceDate);
        endDate = endOfYear(referenceDate);
        break;
    }

    return { startDate, endDate };
  };

  const fetchCollections = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange();

    try {
      let query = supabase
        .from("payments")
        .select("id, account_id, amount, principal_paid, interest_paid, late_fee_paid, payment_method, payment_date")
        .gte("payment_date", startDate.toISOString())
        .lte("payment_date", endDate.toISOString())
        .gt("amount", 0)
        .order("payment_date", { ascending: false });

      if (showByAccount && selectedAccountId !== "all") {
        query = query.eq("account_id", selectedAccountId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching collections:", error);
        setLoading(false);
        return;
      }

      if (data) {
        // Fetch account details for all payments
        const accountIds = [...new Set(data.map(p => p.account_id))];
        const { data: accountsData } = accountIds.length > 0
          ? await supabase.from("customer_accounts").select("id, user_id, vehicle_id").in("id", accountIds)
          : { data: [] };

        const userIds = [...new Set((accountsData || []).map(a => a.user_id))];
        const vehicleIds = [...new Set((accountsData || []).filter(a => a.vehicle_id).map(a => a.vehicle_id))];

        const [profilesRes, vehiclesRes] = await Promise.all([
          userIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] }),
          vehicleIds.length > 0 ? supabase.from("vehicles").select("id, year, make, model").in("id", vehicleIds) : Promise.resolve({ data: [] }),
        ]);

        const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
        const vehiclesMap = new Map((vehiclesRes.data || []).map(v => [v.id, v]));
        const accountsMap = new Map((accountsData || []).map(a => [a.id, a]));

        // Calculate totals
        const totalCollected = data.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalPrincipal = data.reduce((sum, p) => sum + (Number(p.principal_paid) || 0), 0);
        const totalInterest = data.reduce((sum, p) => sum + (Number(p.interest_paid) || 0), 0);
        const totalLateFees = data.reduce((sum, p) => sum + (Number(p.late_fee_paid) || 0), 0);

        setCollectionData({
          totalCollected,
          totalPrincipal,
          totalInterest,
          totalLateFees,
          paymentCount: data.length,
        });

        // Build individual payment details
        const details: PaymentDetail[] = data.map(p => {
          const acc = accountsMap.get(p.account_id);
          const profile = acc ? profilesMap.get(acc.user_id) : null;
          const vehicle = acc?.vehicle_id ? vehiclesMap.get(acc.vehicle_id) : null;
          return {
            ...p,
            amount: Number(p.amount) || 0,
            principal_paid: Number(p.principal_paid) || 0,
            interest_paid: Number(p.interest_paid) || 0,
            late_fee_paid: Number(p.late_fee_paid) || 0,
            customerName: profile?.full_name || "Unknown",
            vehicleInfo: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "",
          };
        });
        setPaymentDetails(details);

        // Calculate breakdown by account
        if (showByAccount && selectedAccountId === "all") {
          const breakdownMap = new Map<string, { customerName: string; vehicleInfo: string; collected: number; interest: number; lateFees: number; count: number }>();

          details.forEach((p) => {
            const existing = breakdownMap.get(p.account_id) || {
              customerName: p.customerName,
              vehicleInfo: p.vehicleInfo,
              collected: 0,
              interest: 0,
              lateFees: 0,
              count: 0,
            };
            existing.collected += p.amount;
            existing.interest += p.interest_paid;
            existing.lateFees += p.late_fee_paid;
            existing.count += 1;
            breakdownMap.set(p.account_id, existing);
          });

          setAccountBreakdown(
            Array.from(breakdownMap.entries()).map(([accountId, d]) => ({
              accountId,
              ...d,
            }))
          );
        } else {
          setAccountBreakdown([]);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getTimeLabel = () => {
    switch (timeFilter) {
      case "daily":
        return format(referenceDate, "MMMM d, yyyy");
      case "weekly": {
        const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
        const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
        return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
      }
      case "monthly":
        return format(referenceDate, "MMMM yyyy");
      case "yearly":
        return format(referenceDate, "yyyy");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Cash Flow & Collections
        </CardTitle>
        <CardDescription>
          Daily and weekly payment collections from Buy Here Pay Here accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Time Period Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Period:</span>
            <div className="flex gap-1">
              {(["daily", "weekly", "monthly", "yearly"] as TimeFilter[]).map((f) => (
                <Button
                  key={f}
                  variant={timeFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setTimeFilter(f); setReferenceDate(new Date()); }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* By Account Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="by-account"
              checked={showByAccount}
              onCheckedChange={setShowByAccount}
            />
            <Label htmlFor="by-account" className="text-sm">
              View by Account
            </Label>
          </div>

          {/* Account Selector (when toggle is on) */}
          {showByAccount && (
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts (Breakdown)</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.customerName} - {acc.vehicleInfo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Period Label with Navigation */}
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold min-w-[180px] text-center">{getTimeLabel()}</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setReferenceDate(new Date())}>
            Today
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 col-span-2 md:col-span-1">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <Banknote className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Collected</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(collectionData.totalCollected)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {collectionData.paymentCount} payment{collectionData.paymentCount !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">Principal</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(collectionData.totalPrincipal)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">Interest</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(collectionData.totalInterest)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">Late Fees</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(collectionData.totalLateFees)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Individual Payments Table */}
            {paymentDetails.length > 0 && !showByAccount && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-3">Payments</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Customer</th>
                        <th className="text-left p-3 text-sm font-medium hidden md:table-cell">Method</th>
                        <th className="text-left p-3 text-sm font-medium hidden md:table-cell">Date</th>
                        <th className="text-right p-3 text-sm font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentDetails.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-3 text-sm">
                            <div className="font-medium">{p.customerName}</div>
                            {p.vehicleInfo && <div className="text-xs text-muted-foreground">{p.vehicleInfo}</div>}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{p.payment_method || "Cash"}</td>
                          <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{format(new Date(p.payment_date), "MMM d, h:mm a")}</td>
                          <td className="p-3 text-sm text-right font-medium text-green-600">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Account Breakdown Table (when viewing all accounts) */}
            {showByAccount && selectedAccountId === "all" && accountBreakdown.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-3">Breakdown by Account</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Customer</th>
                        <th className="text-left p-3 text-sm font-medium hidden md:table-cell">Vehicle</th>
                        <th className="text-right p-3 text-sm font-medium">Collected</th>
                        <th className="text-right p-3 text-sm font-medium hidden md:table-cell">Interest</th>
                        <th className="text-right p-3 text-sm font-medium hidden md:table-cell">Late Fees</th>
                        <th className="text-right p-3 text-sm font-medium">#</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountBreakdown.map((item) => (
                        <tr key={item.accountId} className="border-t">
                          <td className="p-3 text-sm">{item.customerName}</td>
                          <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{item.vehicleInfo}</td>
                          <td className="p-3 text-sm text-right text-blue-600 font-bold">
                            {formatCurrency(item.collected)}
                          </td>
                          <td className="p-3 text-sm text-right text-green-600 font-medium hidden md:table-cell">
                            {formatCurrency(item.interest)}
                          </td>
                          <td className="p-3 text-sm text-right text-orange-600 font-medium hidden md:table-cell">
                            {formatCurrency(item.lateFees)}
                          </td>
                          <td className="p-3 text-sm text-right">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30">
                      <tr className="border-t-2">
                        <td className="p-3 text-sm font-semibold">Total</td>
                        <td className="p-3 hidden md:table-cell" />
                        <td className="p-3 text-sm text-right text-blue-600 font-bold">
                          {formatCurrency(collectionData.totalCollected)}
                        </td>
                        <td className="p-3 text-sm text-right text-green-600 font-bold hidden md:table-cell">
                          {formatCurrency(collectionData.totalInterest)}
                        </td>
                        <td className="p-3 text-sm text-right text-orange-600 font-bold hidden md:table-cell">
                          {formatCurrency(collectionData.totalLateFees)}
                        </td>
                        <td className="p-3 text-sm text-right font-bold">{collectionData.paymentCount}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* No data message */}
            {collectionData.paymentCount === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No payments recorded for this period.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
