import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { format, startOfDay, startOfMonth, startOfYear, endOfDay, endOfMonth, endOfYear } from "date-fns";

type TimeFilter = "daily" | "monthly" | "yearly";

interface AccountOption {
  id: string;
  customerName: string;
  vehicleInfo: string;
}

interface CollectionData {
  totalInterest: number;
  totalLateFees: number;
  paymentCount: number;
}

export const BHPHCollectionsSummary = () => {
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("monthly");
  const [showByAccount, setShowByAccount] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [collectionData, setCollectionData] = useState<CollectionData>({
    totalInterest: 0,
    totalLateFees: 0,
    paymentCount: 0,
  });
  const [accountBreakdown, setAccountBreakdown] = useState<
    Array<{ accountId: string; customerName: string; vehicleInfo: string; interest: number; lateFees: number; count: number }>
  >([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [timeFilter, showByAccount, selectedAccountId]);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("customer_accounts")
      .select(`
        id,
        profiles:user_id (full_name),
        vehicles:vehicle_id (year, make, model)
      `)
      .eq("status", "active");

    if (data && !error) {
      const accountOptions: AccountOption[] = data.map((acc: any) => ({
        id: acc.id,
        customerName: acc.profiles?.full_name || "Unknown",
        vehicleInfo: acc.vehicles ? `${acc.vehicles.year} ${acc.vehicles.make} ${acc.vehicles.model}` : "No vehicle",
      }));
      setAccounts(accountOptions);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (timeFilter) {
      case "daily":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case "monthly":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "yearly":
        startDate = startOfYear(now);
        endDate = endOfYear(now);
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
        .select(`
          id,
          account_id,
          interest_paid,
          late_fee_paid,
          payment_date,
          customer_accounts!inner (
            id,
            profiles:user_id (full_name),
            vehicles:vehicle_id (year, make, model)
          )
        `)
        .gte("payment_date", startDate.toISOString())
        .lte("payment_date", endDate.toISOString());

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
        // Calculate totals
        const totalInterest = data.reduce((sum, p) => sum + (Number(p.interest_paid) || 0), 0);
        const totalLateFees = data.reduce((sum, p) => sum + (Number(p.late_fee_paid) || 0), 0);

        setCollectionData({
          totalInterest,
          totalLateFees,
          paymentCount: data.length,
        });

        // Calculate breakdown by account if showing by account
        if (showByAccount && selectedAccountId === "all") {
          const breakdownMap = new Map<string, { customerName: string; vehicleInfo: string; interest: number; lateFees: number; count: number }>();

          data.forEach((p: any) => {
            const accountId = p.account_id;
            const existing = breakdownMap.get(accountId) || {
              customerName: p.customer_accounts?.profiles?.full_name || "Unknown",
              vehicleInfo: p.customer_accounts?.vehicles
                ? `${p.customer_accounts.vehicles.year} ${p.customer_accounts.vehicles.make} ${p.customer_accounts.vehicles.model}`
                : "No vehicle",
              interest: 0,
              lateFees: 0,
              count: 0,
            };

            existing.interest += Number(p.interest_paid) || 0;
            existing.lateFees += Number(p.late_fee_paid) || 0;
            existing.count += 1;
            breakdownMap.set(accountId, existing);
          });

          setAccountBreakdown(
            Array.from(breakdownMap.entries()).map(([accountId, data]) => ({
              accountId,
              ...data,
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
    const now = new Date();
    switch (timeFilter) {
      case "daily":
        return format(now, "MMMM d, yyyy");
      case "monthly":
        return format(now, "MMMM yyyy");
      case "yearly":
        return format(now, "yyyy");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          BHPH Collections Summary
        </CardTitle>
        <CardDescription>
          Interest and late fees collected from Buy Here Pay Here accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Time Period Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Period:</span>
            <div className="flex gap-1">
              <Button
                variant={timeFilter === "daily" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter("daily")}
              >
                Daily
              </Button>
              <Button
                variant={timeFilter === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant={timeFilter === "yearly" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter("yearly")}
              >
                Yearly
              </Button>
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

        {/* Period Label */}
        <div className="text-sm text-muted-foreground">
          Showing data for: <span className="font-semibold text-foreground">{getTimeLabel()}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Collected</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(collectionData.totalInterest)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Late Fees Collected</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(collectionData.totalLateFees)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(collectionData.totalInterest + collectionData.totalLateFees)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    From {collectionData.paymentCount} payment{collectionData.paymentCount !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Account Breakdown Table (when viewing all accounts) */}
            {showByAccount && selectedAccountId === "all" && accountBreakdown.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-3">Breakdown by Account</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Customer</th>
                        <th className="text-left p-3 text-sm font-medium">Vehicle</th>
                        <th className="text-right p-3 text-sm font-medium">Interest</th>
                        <th className="text-right p-3 text-sm font-medium">Late Fees</th>
                        <th className="text-right p-3 text-sm font-medium">Payments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountBreakdown.map((item) => (
                        <tr key={item.accountId} className="border-t">
                          <td className="p-3 text-sm">{item.customerName}</td>
                          <td className="p-3 text-sm text-muted-foreground">{item.vehicleInfo}</td>
                          <td className="p-3 text-sm text-right text-green-600 font-medium">
                            {formatCurrency(item.interest)}
                          </td>
                          <td className="p-3 text-sm text-right text-orange-600 font-medium">
                            {formatCurrency(item.lateFees)}
                          </td>
                          <td className="p-3 text-sm text-right">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30">
                      <tr className="border-t-2">
                        <td colSpan={2} className="p-3 text-sm font-semibold">Total</td>
                        <td className="p-3 text-sm text-right text-green-600 font-bold">
                          {formatCurrency(collectionData.totalInterest)}
                        </td>
                        <td className="p-3 text-sm text-right text-orange-600 font-bold">
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
