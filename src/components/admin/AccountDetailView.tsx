import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Plus, ArrowLeft, DollarSign, Printer, CreditCard, Calendar, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RaceTrackProgress } from "@/components/RaceTrackProgress";

interface CustomerAccount {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  principal_amount: number;
  current_balance: number;
  interest_rate: number;
  interest_rate_type?: "percentage" | "flat_fee" | string | null;
  payment_amount: number;
  next_payment_date: string;
  late_fee_amount: number | null;
  status: string | null;
  payment_frequency: string | null;
  profile?: {
    full_name: string | null;
    email: string;
    phone: string | null;
    address: string | null;
  };
  vehicle?: {
    year: number;
    make: string;
    model: string;
    vin: string;
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
}

interface AccountDetailViewProps {
  account: CustomerAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
}

export const AccountDetailView = ({ account, open, onOpenChange, onPaymentRecorded }: AccountDetailViewProps) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    principal_paid: 0,
    interest_paid: 0,
    late_fee_paid: 0,
    payment_method: "cash",
    notes: "",
  });

  useEffect(() => {
    if (open && account) {
      fetchPayments();
    }
  }, [open, account?.id]);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("account_id", account.id)
      .order("payment_date", { ascending: false });

    if (data) {
      setPayments(data);
      const total = data.reduce((sum, p) => sum + (Number(p.principal_paid) || 0), 0);
      setTotalPaid(total);
    }
    setLoadingPayments(false);
  };

  const calculateLateFees = () => {
    const today = new Date();
    const nextPaymentDue = new Date(account.next_payment_date + 'T00:00:00');
    const dailyLateFee = account.late_fee_amount || 20; // Default $20/day
    
    if (today > nextPaymentDue) {
      const daysLate = Math.floor((today.getTime() - nextPaymentDue.getTime()) / (1000 * 60 * 60 * 24));
      return daysLate * dailyLateFee;
    }
    return 0;
  };

  const resetPaymentForm = () => {
    // Calculate late fees first
    const lateFees = calculateLateFees();
    
    // Auto-calculate suggested payment breakdown based on interest type
    let suggestedPrincipal = 0;
    let suggestedInterest = 0;

    if (account.interest_rate_type === "flat_fee") {
      // For flat fee: interest is the flat fee amount, principal is the rest
      suggestedInterest = account.interest_rate;
      suggestedPrincipal = account.payment_amount - suggestedInterest;
    } else {
      // For percentage: calculate monthly interest
      const monthlyInterest = (account.current_balance * (account.interest_rate / 100)) / 12;
      suggestedInterest = Math.round(monthlyInterest * 100) / 100;
      suggestedPrincipal = account.payment_amount - suggestedInterest;
    }

    // Adjust for late fees - they come off principal if included in same payment amount
    if (lateFees > 0) {
      suggestedPrincipal = Math.max(0, suggestedPrincipal - lateFees);
    }

    setPaymentForm({
      amount: account.payment_amount + lateFees,
      principal_paid: Math.max(0, Math.round(suggestedPrincipal * 100) / 100),
      interest_paid: suggestedInterest,
      late_fee_paid: lateFees,
      payment_method: "cash",
      notes: lateFees > 0 ? `Includes $${lateFees.toFixed(2)} in late fees` : "",
    });
  };

  const handleOpenPaymentForm = () => {
    resetPaymentForm();
    setShowPaymentForm(true);
  };

  const generateInvoiceNumber = (paymentId: string, date: string) => {
    const dateStr = new Date(date).toISOString().split('T')[0].replace(/-/g, '');
    return `INV-${dateStr}-${paymentId.slice(0, 6).toUpperCase()}`;
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const paymentDate = new Date().toISOString();

    const paymentData = {
      account_id: account.id,
      amount: paymentForm.amount,
      principal_paid: paymentForm.principal_paid,
      interest_paid: paymentForm.interest_paid,
      late_fee_paid: paymentForm.late_fee_paid || 0,
      payment_method: paymentForm.payment_method,
      notes: paymentForm.notes || null,
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
      const newBalance = account.current_balance - paymentForm.principal_paid;
      
      // Calculate next payment date based on payment frequency
      const calculateNextPaymentDate = (currentDate: string, frequency: string | null): string => {
        const date = new Date(currentDate + 'T00:00:00');
        switch (frequency) {
          case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
          case 'bi-weekly':
            date.setDate(date.getDate() + 14);
            break;
          case 'monthly':
          default:
            date.setMonth(date.getMonth() + 1);
            break;
        }
        return date.toISOString().split('T')[0];
      };

      const nextPaymentDate = calculateNextPaymentDate(account.next_payment_date, account.payment_frequency);

      await supabase
        .from("customer_accounts")
        .update({
          current_balance: Math.max(0, newBalance),
          next_payment_date: nextPaymentDate,
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
            principalPaid: paymentForm.principal_paid,
            interestPaid: paymentForm.interest_paid,
            lateFeePaid: paymentForm.late_fee_paid || 0,
            totalAmount: paymentForm.amount,
            paymentMethod: paymentForm.payment_method || 'Cash',
            remainingBalance: Math.max(0, newBalance),
            notes: paymentForm.notes || undefined,
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

      setShowPaymentForm(false);
      fetchPayments();
      onPaymentRecorded();
    }

    setSaving(false);
  };

  const printReceipt = (payment: Payment) => {
    const date = new Date(payment.payment_date).toLocaleDateString();
    const invoiceNumber = generateInvoiceNumber(payment.id, payment.payment_date);
    
    const receiptHTML = `
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
          <p style="margin: 5px 0;"><strong>Name:</strong> ${account.profile?.full_name || 'N/A'}</p>
          ${account.vehicle ? `<p style="margin: 5px 0;"><strong>Vehicle:</strong> ${account.vehicle.year} ${account.vehicle.make} ${account.vehicle.model}</p>` : ''}
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px; color: #333;">Payment Details</h3>
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    // Add T00:00:00 to prevent timezone offset issues with date-only strings
    const dateStr = dateString.includes('T') ? dateString : dateString + 'T00:00:00';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "paid_off":
        return <Badge className="bg-blue-500">Paid Off</Badge>;
      case "delinquent":
        return <Badge variant="destructive">Delinquent</Badge>;
      case "repossessed":
        return <Badge variant="secondary">Repossessed</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Account Overview
          </DialogTitle>
          <DialogDescription>
            {account.profile?.full_name || "Customer"} - {account.vehicle ? `${account.vehicle.year} ${account.vehicle.make} ${account.vehicle.model}` : "No vehicle"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Account Summary - Same as customer view */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{account.profile?.full_name || "Customer"}</CardTitle>
                    <CardDescription>
                      {account.profile?.email} {account.profile?.phone && `• ${account.profile.phone}`}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(account.status)}
              </div>
            </CardHeader>
            <CardContent>
              {/* Progress tracker */}
              {account.principal_amount > 0 && (
                <div className="mb-6">
                  <RaceTrackProgress 
                    startingBalance={account.principal_amount}
                    currentBalance={account.current_balance}
                    totalPaid={totalPaid}
                  />
                </div>
              )}

              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-background rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(account.current_balance)}</p>
                </div>
                <div className="bg-background rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground mb-1">Monthly Payment</p>
                  <p className="text-2xl font-bold">{formatCurrency(account.payment_amount)}</p>
                </div>
                <div className="bg-background rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground mb-1">Next Payment Due</p>
                  <p className="text-xl font-bold">
                    {account.next_payment_date 
                      ? formatDate(account.next_payment_date + 'T00:00:00')
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-background rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground mb-1">
                    {account.interest_rate_type === "flat_fee" ? "Flat Fee" : "Interest Rate"}
                  </p>
                  <p className="text-xl font-bold">
                    {account.interest_rate_type === "flat_fee" 
                      ? `${formatCurrency(account.interest_rate)}/mo`
                      : `${account.interest_rate}% APR`
                    }
                  </p>
                </div>
              </div>

              <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  <span>Original Principal: {formatCurrency(account.principal_amount)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Payment Frequency: {account.payment_frequency || "Monthly"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Late Fee: {formatCurrency(account.late_fee_amount || 25)}/day</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Record Payment Button */}
          <div className="flex justify-end">
            <Button onClick={handleOpenPaymentForm}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>

          {/* Payment Form */}
          {showPaymentForm && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Record New Payment</CardTitle>
                <CardDescription>Enter the payment breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="principal">Principal ($)</Label>
                      <Input
                        id="principal"
                        type="number"
                        step="0.01"
                        value={paymentForm.principal_paid}
                        onChange={(e) => {
                          const principal = parseFloat(e.target.value) || 0;
                          setPaymentForm(prev => ({
                            ...prev,
                            principal_paid: principal,
                            amount: principal + prev.interest_paid + prev.late_fee_paid,
                          }));
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interest">Interest ($)</Label>
                      <Input
                        id="interest"
                        type="number"
                        step="0.01"
                        value={paymentForm.interest_paid}
                        onChange={(e) => {
                          const interest = parseFloat(e.target.value) || 0;
                          setPaymentForm(prev => ({
                            ...prev,
                            interest_paid: interest,
                            amount: prev.principal_paid + interest + prev.late_fee_paid,
                          }));
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lateFee">Late Fee ($)</Label>
                      <Input
                        id="lateFee"
                        type="number"
                        step="0.01"
                        value={paymentForm.late_fee_paid}
                        onChange={(e) => {
                          const lateFee = parseFloat(e.target.value) || 0;
                          setPaymentForm(prev => ({
                            ...prev,
                            late_fee_paid: lateFee,
                            amount: prev.principal_paid + prev.interest_paid + lateFee,
                          }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total">Total Amount ($)</Label>
                      <Input
                        id="total"
                        type="number"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        className="font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="method">Payment Method</Label>
                      <Select
                        value={paymentForm.payment_method}
                        onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="zelle">Zelle</SelectItem>
                          <SelectItem value="cashapp">Cash App</SelectItem>
                          <SelectItem value="venmo">Venmo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any additional notes..."
                        rows={1}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Record Payment
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>
                {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Principal</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Late Fee</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {formatDate(payment.payment_date)}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.principal_paid)}</TableCell>
                          <TableCell>{formatCurrency(payment.interest_paid)}</TableCell>
                          <TableCell>{formatCurrency(payment.late_fee_paid || 0)}</TableCell>
                          <TableCell className="font-bold">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method || "Cash"}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {payment.notes || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => printReceipt(payment)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
