import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Loader2, ArrowLeft, Car, DollarSign, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VehicleStats {
  total: number;
  active: number;
  sold: number;
  pending: number;
  totalValue: number;
}

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  thisMonth: number;
}

interface OverdueAccount {
  id: string;
  customerName: string;
  customerEmail: string;
  currentBalance: number;
  paymentAmount: number;
  nextPaymentDate: string;
  daysOverdue: number;
  vehicleInfo: string;
}

const AdminReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vehicleStats, setVehicleStats] = useState<VehicleStats>({
    total: 0,
    active: 0,
    sold: 0,
    pending: 0,
    totalValue: 0,
  });
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalAmount: 0,
    thisMonth: 0,
  });
  const [recentVehicles, setRecentVehicles] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [overdueAccounts, setOverdueAccounts] = useState<OverdueAccount[]>([]);

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
      fetchStats();
      fetchOverdueAccounts();
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

  const fetchStats = async () => {
    // Fetch vehicle stats
    const { data: vehicles } = await supabase.from("vehicles").select("*");
    
    if (vehicles) {
      const stats: VehicleStats = {
        total: vehicles.length,
        active: vehicles.filter(v => v.status === "active").length,
        sold: vehicles.filter(v => v.status === "sold").length,
        pending: vehicles.filter(v => v.status === "pending").length,
        totalValue: vehicles.reduce((sum, v) => sum + (v.price || 0), 0),
      };
      setVehicleStats(stats);
      setRecentVehicles(vehicles.slice(0, 5));
    }

    // Fetch payment stats
    const { data: payments } = await supabase.from("payments").select("*");
    
    if (payments) {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const stats: PaymentStats = {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        thisMonth: payments.filter(p => new Date(p.payment_date) >= thisMonth).reduce((sum, p) => sum + (p.amount || 0), 0),
      };
      setPaymentStats(stats);
      setRecentPayments(payments.slice(0, 5));
    }
  };

  const fetchOverdueAccounts = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch accounts with past due dates
    const { data: accounts, error } = await supabase
      .from("customer_accounts")
      .select(`
        id,
        user_id,
        current_balance,
        payment_amount,
        next_payment_date,
        vehicle_id,
        status,
        vehicles (year, make, model)
      `)
      .eq("status", "active")
      .lt("next_payment_date", today);

    if (error) {
      console.error("Error fetching overdue accounts:", error);
      return;
    }

    if (!accounts || accounts.length === 0) {
      setOverdueAccounts([]);
      return;
    }

    // Fetch profiles for customer names
    const userIds = accounts.map(a => a.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const overdueList: OverdueAccount[] = accounts.map(account => {
      const profile = profileMap.get(account.user_id);
      const nextPaymentDate = new Date(account.next_payment_date);
      const todayDate = new Date();
      const daysOverdue = Math.floor((todayDate.getTime() - nextPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const vehicle = account.vehicles as { year: number; make: string; model: string } | null;
      const vehicleInfo = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "N/A";

      return {
        id: account.id,
        customerName: profile?.full_name || "Unknown",
        customerEmail: profile?.email || "",
        currentBalance: account.current_balance,
        paymentAmount: account.payment_amount,
        nextPaymentDate: account.next_payment_date,
        daysOverdue,
        vehicleInfo,
      };
    });

    // Sort by days overdue (most overdue first)
    overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);
    setOverdueAccounts(overdueList);
  };

  const getOverdueStatus = (days: number) => {
    if (days >= 30) return { label: "Severely Overdue", variant: "destructive" as const };
    if (days >= 14) return { label: "Overdue", variant: "destructive" as const };
    if (days >= 7) return { label: "Past Due", variant: "secondary" as const };
    return { label: "Recently Due", variant: "outline" as const };
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
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/admin/vehicles")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Activity Reports</h1>
            <p className="text-muted-foreground mt-1">
              Overview of inventory and payment activity
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vehicleStats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {vehicleStats.active} active, {vehicleStats.sold} sold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${vehicleStats.totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total active inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${paymentStats.totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {paymentStats.totalPayments} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue Accounts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdueAccounts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ${overdueAccounts.reduce((sum, a) => sum + a.paymentAmount, 0).toLocaleString()} pending
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Accounts Section */}
        {overdueAccounts.length > 0 && (
          <Card className="mb-8 border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Overdue & Unpaid Accounts
              </CardTitle>
              <CardDescription>
                Accounts with past due payments requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Payment Due</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueAccounts.map((account) => {
                    const status = getOverdueStatus(account.daysOverdue);
                    return (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{account.customerName}</div>
                            <div className="text-xs text-muted-foreground">{account.customerEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{account.vehicleInfo}</TableCell>
                        <TableCell className="font-medium">${account.paymentAmount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(account.nextPaymentDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-destructive font-medium">{account.daysOverdue} days</TableCell>
                        <TableCell>${account.currentBalance.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Vehicle Status Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
              <CardDescription>Current vehicle status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active (For Sale)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${vehicleStats.total > 0 ? (vehicleStats.active / vehicleStats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{vehicleStats.active}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sold</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${vehicleStats.total > 0 ? (vehicleStats.sold / vehicleStats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{vehicleStats.sold}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${vehicleStats.total > 0 ? (vehicleStats.pending / vehicleStats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{vehicleStats.pending}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Vehicles Added</CardTitle>
              <CardDescription>Latest inventory additions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentVehicles.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No vehicles yet</p>
              ) : (
                <div className="space-y-3">
                  {recentVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex justify-between items-center">
                      <span className="text-sm">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                      <span className="text-sm font-medium">${vehicle.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;