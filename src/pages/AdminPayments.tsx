import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Loader2, Plus, ArrowLeft, Receipt, Printer, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CustomerAccount {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  principal_amount: number;
  current_balance: number;
  interest_rate: number;
  payment_amount: number;
  next_payment_date: string;
  late_fee_amount: number | null;
  status: string | null;
  payment_frequency: string | null;
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
  receipt_url: string | null;
  payment_method: string | null;
  account?: CustomerAccount;
}

const AdminPayments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    account_id: "",
    amount: 0,
    principal_paid: 0,
    interest_paid: 0,
    late_fee_paid: 0,
    payment_method: "cash",
    notes: "",
  });

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
      // Fetch related profiles and vehicles
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

    // Fetch payments
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("*")
      .order("payment_date", { ascending: false });

    if (paymentsData) {
      setPayments(paymentsData);
    }
  };

  const resetForm = () => {
    setFormData({
      account_id: "",
      amount: 0,
      principal_paid: 0,
      interest_paid: 0,
      late_fee_paid: 0,
      payment_method: "cash",
      notes: "",
    });
  };

  const handleAccountSelect = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      // Auto-calculate suggested payment breakdown
      const monthlyInterest = (account.current_balance * (account.interest_rate / 100)) / 12;
      const suggestedPrincipal = account.payment_amount - monthlyInterest;
      
      setFormData(prev => ({
        ...prev,
        account_id: accountId,
        amount: account.payment_amount,
        principal_paid: Math.max(0, suggestedPrincipal),
        interest_paid: monthlyInterest,
        late_fee_paid: 0,
      }));
    }
  };

  const generateInvoiceNumber = (paymentId: string, date: string) => {
    const dateStr = new Date(date).toISOString().split('T')[0].replace(/-/g, '');
    return `INV-${dateStr}-${paymentId.slice(0, 6).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const paymentDate = new Date().toISOString();

    const paymentData = {
      account_id: formData.account_id,
      amount: formData.amount,
      principal_paid: formData.principal_paid,
      interest_paid: formData.interest_paid,
      late_fee_paid: formData.late_fee_paid || 0,
      payment_method: formData.payment_method,
      notes: formData.notes || null,
      created_by: user?.id || null,
      payment_date: paymentDate,
    };

    const { data: newPayment, error } = await supabase
      .from("payments")
      .insert(paymentData)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    } else {
      // Update account balance
      const account = accounts.find(a => a.id === formData.account_id);
      if (account) {
        const newBalance = account.current_balance - formData.principal_paid;
        const nextPaymentDate = new Date(account.next_payment_date);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

        await supabase
          .from("customer_accounts")
          .update({
            current_balance: Math.max(0, newBalance),
            next_payment_date: nextPaymentDate.toISOString().split('T')[0],
          })
          .eq("id", account.id);

        // Send receipt email
        const invoiceNumber = generateInvoiceNumber(newPayment.id, paymentDate);
        try {
          await supabase.functions.invoke('send-payment-receipt', {
            body: {
              paymentId: newPayment.id,
              customerName: account.profile?.full_name || 'Customer',
              customerEmail: account.profile?.email || '',
              vehicleInfo: account.vehicle 
                ? `${account.vehicle.year} ${account.vehicle.make} ${account.vehicle.model}` 
                : 'N/A',
              paymentDate: new Date(paymentDate).toLocaleDateString(),
              invoiceNumber,
              principalPaid: formData.principal_paid,
              interestPaid: formData.interest_paid,
              lateFeePaid: formData.late_fee_paid || 0,
              totalAmount: formData.amount,
              paymentMethod: formData.payment_method || 'Cash',
              remainingBalance: Math.max(0, newBalance),
              notes: formData.notes || undefined,
            },
          });
          toast({
            title: "Success",
            description: "Payment recorded and receipt sent to customer",
          });
        } catch (emailError) {
          console.error("Failed to send receipt email:", emailError);
          toast({
            title: "Success",
            description: "Payment recorded (email notification failed)",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Payment recorded successfully",
        });
      }
      
      // Show receipt
      const paymentWithAccount = {
        ...newPayment,
        account: accounts.find(a => a.id === formData.account_id),
      };
      setSelectedReceipt(paymentWithAccount);
      setShowReceipt(true);
      
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    }

    setSaving(false);
  };

  const generateReceiptHTML = (payment: Payment) => {
    const account = accounts.find(a => a.id === payment.account_id);
    const date = new Date(payment.payment_date).toLocaleDateString();
    const invoiceNumber = generateInvoiceNumber(payment.id, payment.payment_date);
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">Quality Foreign Domestic Autos</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Professional Auto Sales & Service</p>
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #22c55e; margin: 0;">PAYMENT RECEIPT</h2>
          <p style="color: #666; margin: 5px 0;">Invoice #${invoiceNumber}</p>
          <p style="color: #666; margin: 5px 0;">Date: ${date}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px; color: #333;">Customer Information</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${account?.profile?.full_name || 'N/A'}</p>
          ${account?.vehicle ? `<p style="margin: 5px 0;"><strong>Vehicle:</strong> ${account.vehicle.year} ${account.vehicle.make} ${account.vehicle.model}</p>` : ''}
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px; color: #333;">Service Details</h3>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
            <span>Principal Payment:</span>
            <span>$${payment.principal_paid.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
            <span>Interest Payment:</span>
            <span>$${payment.interest_paid.toFixed(2)}</span>
          </div>
          ${payment.late_fee_paid && payment.late_fee_paid > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
            <span>Late Fee:</span>
            <span>$${payment.late_fee_paid.toFixed(2)}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
            <span>Payment Method:</span>
            <span>${payment.payment_method || 'Cash'}</span>
          </div>
        </div>
        
        <div style="background: #22c55e; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
            <span>TOTAL PAID:</span>
            <span>$${payment.amount.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          ${account ? `<p style="margin: 5px 0;"><strong>Remaining Balance:</strong> $${(account.current_balance - payment.principal_paid).toFixed(2)}</p>` : ''}
        </div>
        
        ${payment.notes ? `
        <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px;"><strong>Notes:</strong> ${payment.notes}</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 25px; color: #666;">
          <h3 style="color: #22c55e; margin-bottom: 10px;">Thank You for Your Business!</h3>
          <p style="margin: 5px 0; font-size: 14px;">We appreciate your trust in Quality Foreign Domestic Autos.</p>
          <p style="margin: 15px 0 5px 0; font-size: 12px;">Contact: 470-519-6717 | ramon@carsandclaims.com</p>
        </div>
      </div>
    `;
  };

  const printReceipt = (payment: Payment) => {
    const receiptHTML = generateReceiptHTML(payment);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payment Receipt</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
              }
            </style>
          </head>
          <body>
            ${receiptHTML}
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const getAccountDisplay = (account: CustomerAccount) => {
    const customerName = account.profile?.full_name || account.profile?.email || 'Unknown';
    const vehicleInfo = account.vehicle 
      ? `${account.vehicle.year} ${account.vehicle.make} ${account.vehicle.model}` 
      : 'No vehicle';
    return `${customerName} - ${vehicleInfo}`;
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
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Payment Management</h1>
              <p className="text-muted-foreground mt-1">
                Record payments and generate receipts
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={accounts.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record New Payment</DialogTitle>
                <DialogDescription>
                  Select an account and enter payment details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="account">Customer Account</Label>
                  <Select
                    value={formData.account_id}
                    onValueChange={handleAccountSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {getAccountDisplay(account)} - ${account.current_balance.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Total Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="money_order">Money Order</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="principal">Principal ($)</Label>
                    <Input
                      id="principal"
                      type="number"
                      step="0.01"
                      value={formData.principal_paid}
                      onChange={(e) => setFormData(prev => ({ ...prev, principal_paid: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest">Interest ($)</Label>
                    <Input
                      id="interest"
                      type="number"
                      step="0.01"
                      value={formData.interest_paid}
                      onChange={(e) => setFormData(prev => ({ ...prev, interest_paid: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="late_fee">Late Fee ($)</Label>
                    <Input
                      id="late_fee"
                      type="number"
                      step="0.01"
                      value={formData.late_fee_paid}
                      onChange={(e) => setFormData(prev => ({ ...prev, late_fee_paid: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes about this payment..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !formData.account_id}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Record Payment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accounts.filter(a => a.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ${accounts.reduce((sum, a) => sum + a.current_balance, 0).toLocaleString()} total balance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ${payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} collected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${payments
                  .filter(p => new Date(p.payment_date).getMonth() === new Date().getMonth())
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Payments received</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>View and print payment receipts</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payments recorded yet. {accounts.length === 0 && "Create customer accounts first."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const account = accounts.find(a => a.id === payment.account_id);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {payment.id.slice(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell>
                            {account?.profile?.full_name || account?.profile?.email || 'Unknown'}
                          </TableCell>
                          <TableCell className="font-medium">
                            ${payment.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.payment_method || 'cash'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => printReceipt({ ...payment, account })}
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              Print
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Preview Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>
              Payment recorded successfully
            </DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div 
              className="border rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: generateReceiptHTML(selectedReceipt) }}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReceipt(false)}>
              Close
            </Button>
            <Button onClick={() => selectedReceipt && printReceipt(selectedReceipt)}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;