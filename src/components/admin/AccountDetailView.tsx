import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountDocuments } from "@/components/AccountDocuments";
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
import { Loader2, Plus, ArrowLeft, DollarSign, Printer, CreditCard, Calendar, TrendingDown, Gift, Percent, AlertCircle, RefreshCw, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RaceTrackProgress } from "@/components/RaceTrackProgress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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
  waived_late_fees?: number | null;
  waived_interest?: number | null;
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
  entry_type: string;
  waived_interest: number | null;
  waived_late_fees: number | null;
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
  const [showWaiverForm, setShowWaiverForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingToStripe, setSyncingToStripe] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);
  
  const [waiverForm, setWaiverForm] = useState({
    waive_late_fees: 0,
    waive_interest: 0,
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    principal_paid: 0,
    interest_paid: 0,
    late_fee_paid: 0,
    payment_method: "cash",
    notes: "",
    payment_date: new Date(),
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
      const totalLateFees = daysLate * dailyLateFee;
      // Subtract any waived late fees
      const waivedLateFees = account.waived_late_fees || 0;
      return Math.max(0, totalLateFees - waivedLateFees);
    }
    return 0;
  };

  const resetPaymentForm = () => {
    // Calculate late fees first (already accounts for waived late fees)
    const lateFees = calculateLateFees();
    
    // Calculate waived interest that can be applied
    const waivedInterest = account.waived_interest || 0;
    
    // Auto-calculate suggested payment breakdown based on interest type
    let suggestedPrincipal = 0;
    let suggestedInterest = 0;

    if (account.interest_rate_type === "flat_fee") {
      // For flat fee: split evenly based on payment frequency
      const periodsPerMonth = account.payment_frequency === 'weekly' ? (52 / 12) : 1;
      const periodInterest = account.interest_rate / periodsPerMonth;
      suggestedInterest = Math.max(0, Math.round((periodInterest - waivedInterest) * 100) / 100);
      suggestedPrincipal = account.payment_amount - periodInterest;
    } else {
      // For percentage: calculate interest per payment period
      const periodsPerYear = account.payment_frequency === 'weekly' ? 52 : 12;
      const periodInterest = (account.current_balance * (account.interest_rate / 100)) / periodsPerYear;
      const calculatedInterest = Math.round(periodInterest * 100) / 100;
      suggestedInterest = Math.max(0, calculatedInterest - waivedInterest);
      suggestedPrincipal = account.payment_amount - calculatedInterest;
    }

    // Adjust for late fees - they come off principal if included in same payment amount
    if (lateFees > 0) {
      suggestedPrincipal = Math.max(0, suggestedPrincipal - lateFees);
    }

    // The total amount due is reduced by waived amounts
    const totalDue = account.payment_amount + lateFees - waivedInterest;

    setPaymentForm({
      amount: Math.max(0, totalDue),
      principal_paid: Math.max(0, Math.round(suggestedPrincipal * 100) / 100),
      interest_paid: Math.max(0, suggestedInterest),
      late_fee_paid: lateFees,
      payment_method: "cash",
      notes: lateFees > 0 || waivedInterest > 0 
        ? `${lateFees > 0 ? `Late fees: $${lateFees.toFixed(2)}` : ''}${lateFees > 0 && waivedInterest > 0 ? ' | ' : ''}${waivedInterest > 0 ? `Waived interest applied: $${waivedInterest.toFixed(2)}` : ''}`
        : "",
      payment_date: new Date(),
    });
  };

  const handleOpenPaymentForm = () => {
    resetPaymentForm();
    setShowPaymentForm(true);
  };

  const handleOpenWaiverForm = () => {
    setWaiverForm({
      waive_late_fees: calculateLateFees(),
      waive_interest: 0,
      notes: "",
    });
    setShowWaiverForm(true);
  };

  const handleSubmitWaiver = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const currentWaivedLateFees = (account as any).waived_late_fees || 0;
    const currentWaivedInterest = (account as any).waived_interest || 0;

    const { error } = await supabase
      .from("customer_accounts")
      .update({
        waived_late_fees: currentWaivedLateFees + waiverForm.waive_late_fees,
        waived_interest: currentWaivedInterest + waiverForm.waive_interest,
      })
      .eq("id", account.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save waiver",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Waived ${formatCurrency(waiverForm.waive_late_fees)} in late fees and ${formatCurrency(waiverForm.waive_interest)} in interest`,
      });
      setShowWaiverForm(false);
      onPaymentRecorded(); // Refresh parent data
    }

    setSaving(false);
  };

  const generateInvoiceNumber = (paymentId: string, date: string) => {
    const dateStr = new Date(date).toISOString().split('T')[0].replace(/-/g, '');
    return `INV-${dateStr}-${paymentId.slice(0, 6).toUpperCase()}`;
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const paymentDate = paymentForm.payment_date.toISOString();

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

      // Use the selected payment date (not today) as the basis for next due date
      const paymentDateStr = format(paymentForm.payment_date, 'yyyy-MM-dd');
      const nextPaymentDate = calculateNextPaymentDate(paymentDateStr, account.payment_frequency);

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
                  <p className="text-sm text-muted-foreground mb-1">{account.payment_frequency === 'weekly' ? 'Weekly' : 'Monthly'} Payment</p>
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
                    {account.interest_rate_type === "flat_fee" ? "Flat Fee Interest" : "Interest Rate"}
                  </p>
                  <p className="text-xl font-bold">
                    {account.interest_rate_type === "flat_fee" 
                      ? account.payment_frequency === 'weekly'
                        ? `${formatCurrency(account.interest_rate / (52 / 12))}/wk`
                        : `${formatCurrency(account.interest_rate)}/mo`
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

              {/* Waiver Summary Display */}
              {((account.waived_late_fees || 0) > 0 || (account.waived_interest || 0) > 0) && (
                <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                    <Gift className="h-4 w-4" />
                    <span>Waivers Applied</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2 text-sm">
                    {(account.waived_late_fees || 0) > 0 && (
                      <div className="text-green-600 dark:text-green-400">
                        Late Fees Waived: {formatCurrency(account.waived_late_fees || 0)}
                      </div>
                    )}
                    {(account.waived_interest || 0) > 0 && (
                      <div className="text-green-600 dark:text-green-400">
                        Interest Waived: {formatCurrency(account.waived_interest || 0)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Current Late Fees Display */}
              {calculateLateFees() > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
                      <AlertCircle className="h-4 w-4" />
                      <span>Current Late Fees: {formatCurrency(calculateLateFees())}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={async () => {
                if (!account.profile?.email) {
                  toast({
                    title: "Error",
                    description: "Customer email is required to sync with Stripe",
                    variant: "destructive",
                  });
                  return;
                }
                setSyncingToStripe(true);
                try {
                  const { data, error } = await supabase.functions.invoke('update-stripe-customer', {
                    body: {
                      email: account.profile.email,
                      phone: account.profile.phone || null,
                    },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  toast({
                    title: "Success",
                    description: `Phone number synced to Stripe${data?.newPhone ? `: ${data.newPhone}` : ''}`,
                  });
                } catch (err: any) {
                  toast({
                    title: "Sync Failed",
                    description: err.message || "Failed to sync with Stripe",
                    variant: "destructive",
                  });
                } finally {
                  setSyncingToStripe(false);
                }
              }}
              disabled={syncingToStripe}
            >
              {syncingToStripe ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync to Stripe
            </Button>
            <Button variant="outline" onClick={handleOpenWaiverForm}>
              <Gift className="h-4 w-4 mr-2" />
              Waive Fees
            </Button>
            <Button onClick={handleOpenPaymentForm}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>

          {/* Waiver Form */}
          {showWaiverForm && (
            <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-600" />
                  Waive Fees
                </CardTitle>
                <CardDescription>Waive late fees and/or interest for this account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitWaiver} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="waive_late_fees">Waive Late Fees ($)</Label>
                      <Input
                        id="waive_late_fees"
                        type="number"
                        step="0.01"
                        min="0"
                        value={waiverForm.waive_late_fees}
                        onChange={(e) => setWaiverForm(prev => ({ ...prev, waive_late_fees: parseFloat(e.target.value) || 0 }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Current late fees: {formatCurrency(calculateLateFees())}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="waive_interest">Waive Interest ($)</Label>
                      <Input
                        id="waive_interest"
                        type="number"
                        step="0.01"
                        min="0"
                        value={waiverForm.waive_interest}
                        onChange={(e) => setWaiverForm(prev => ({ ...prev, waive_interest: parseFloat(e.target.value) || 0 }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Monthly interest: {account.interest_rate_type === "flat_fee" 
                          ? formatCurrency(account.interest_rate)
                          : formatCurrency((account.current_balance * (account.interest_rate / 100)) / 12)
                        }
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waiver_notes">Notes (Optional)</Label>
                    <Textarea
                      id="waiver_notes"
                      value={waiverForm.notes}
                      onChange={(e) => setWaiverForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Reason for waiver..."
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowWaiverForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Apply Waiver
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

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

                  <div className="grid md:grid-cols-3 gap-4">
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
                          <SelectItem value="apple_pay">Apple Pay</SelectItem>
                          <SelectItem value="venmo">Venmo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !paymentForm.payment_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(paymentForm.payment_date, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={paymentForm.payment_date}
                            onSelect={(date) => date && setPaymentForm(prev => ({ ...prev, payment_date: date }))}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
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

          {/* Account Documents */}
          <AccountDocuments 
            accountId={account.id} 
            userRole="admin" 
            userId={account.user_id} 
          />

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
                        <TableHead>Prev Balance</TableHead>
                        <TableHead>Entry</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Calculate previous balance for each payment
                        // Payments are sorted newest first; reconstruct balance backwards
                        let runningBalance = account.current_balance;
                        const balanceMap = new Map<string, number>();
                        for (const p of payments) {
                          const prevBalance = runningBalance + p.amount;
                          balanceMap.set(p.id, prevBalance);
                          runningBalance = prevBalance;
                        }
                        return payments.flatMap((payment) => {
                          const rows = [
                            <TableRow key={payment.id}>
                              <TableCell className="font-medium">
                                {formatDate(payment.payment_date)}
                              </TableCell>
                              <TableCell>{formatCurrency(payment.principal_paid)}</TableCell>
                              <TableCell>{formatCurrency(payment.interest_paid)}</TableCell>
                              <TableCell>{formatCurrency(payment.late_fee_paid || 0)}</TableCell>
                              <TableCell className="font-bold">{formatCurrency(payment.amount)}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatCurrency(balanceMap.get(payment.id) ?? 0)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={payment.entry_type === 'automatic' ? 'default' : 'secondary'}>
                                  {payment.entry_type === 'automatic' ? 'Auto' : 'Manual'}
                                </Badge>
                              </TableCell>
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
                          ];
                          if ((payment.waived_interest || 0) > 0) {
                            rows.push(
                              <TableRow key={`${payment.id}-waived-int`} className="bg-orange-50 dark:bg-orange-950/20 border-0">
                                <TableCell className="pl-8 text-orange-600 text-xs font-medium" colSpan={4}>
                                  <Gift className="h-3 w-3 inline mr-1" />
                                  Interest Waived
                                </TableCell>
                                <TableCell className="text-orange-600 font-medium">
                                  -{formatCurrency(payment.waived_interest || 0)}
                                </TableCell>
                                <TableCell colSpan={5} className="text-orange-600 text-xs">
                                  Applied on {formatDate(payment.payment_date)}
                                </TableCell>
                              </TableRow>
                            );
                          }
                          if ((payment.waived_late_fees || 0) > 0) {
                            rows.push(
                              <TableRow key={`${payment.id}-waived-fees`} className="bg-orange-50 dark:bg-orange-950/20 border-0">
                                <TableCell className="pl-8 text-orange-600 text-xs font-medium" colSpan={4}>
                                  <Gift className="h-3 w-3 inline mr-1" />
                                  Late Fees Waived
                                </TableCell>
                                <TableCell className="text-orange-600 font-medium">
                                  -{formatCurrency(payment.waived_late_fees || 0)}
                                </TableCell>
                                <TableCell colSpan={5} className="text-orange-600 text-xs">
                                  Applied on {formatDate(payment.payment_date)}
                                </TableCell>
                              </TableRow>
                            );
                          }
                          return rows;
                        });
                      })()}
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
