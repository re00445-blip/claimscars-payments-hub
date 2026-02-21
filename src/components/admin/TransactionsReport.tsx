import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Printer, Edit2, DollarSign, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  account_id: string;
  amount: number;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  late_fee_paid: number | null;
  notes: string | null;
  payment_method: string | null;
  created_by: string | null;
  profile?: {
    full_name: string | null;
    email: string;
  };
  vehicle?: {
    year: number;
    make: string;
    model: string;
  };
  account_user_id?: string;
}

type TimeFilter = "day" | "week" | "month" | "prior_month";

const getPriorMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
};

export const TransactionsReport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");
  const [selectedPriorMonth, setSelectedPriorMonth] = useState<string>("");
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({
    amount: 0,
    principal_paid: 0,
    interest_paid: 0,
    late_fee_paid: 0,
    notes: "",
  });

  useEffect(() => {
    fetchPayments();
  }, [timeFilter, selectedPriorMonth]);

  const fetchPayments = async () => {
    setLoading(true);
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date | null = null;
    
    switch (timeFilter) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "prior_month":
        if (!selectedPriorMonth) { setLoading(false); return; }
        const [year, month] = selectedPriorMonth.split("-").map(Number);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
        break;
    }

    let query = supabase
      .from("payments")
      .select("*")
      .gte("payment_date", startDate.toISOString())
      .order("payment_date", { ascending: false });

    if (endDate) {
      query = query.lte("payment_date", endDate.toISOString());
    }

    const { data: paymentsData } = await query;

    if (paymentsData) {
      // Fetch related data
      const paymentsWithDetails = await Promise.all(
        paymentsData.map(async (payment) => {
          const { data: account } = await supabase
            .from("customer_accounts")
            .select("user_id, vehicle_id")
            .eq("id", payment.account_id)
            .maybeSingle();

          let profile = null;
          let vehicle = null;

          if (account?.user_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", account.user_id)
              .maybeSingle();
            profile = profileData;
          }

          if (account?.vehicle_id) {
            const { data: vehicleData } = await supabase
              .from("vehicles")
              .select("year, make, model")
              .eq("id", account.vehicle_id)
              .maybeSingle();
            vehicle = vehicleData;
          }

          return { ...payment, profile, vehicle, account_user_id: account?.user_id };
        })
      );
      setPayments(paymentsWithDetails);
    }
    
    setLoading(false);
  };

  const getTotalAmount = () => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  };

  const handleEditClick = (payment: Payment) => {
    setEditingPayment(payment);
    setEditForm({
      amount: payment.amount,
      principal_paid: payment.principal_paid,
      interest_paid: payment.interest_paid,
      late_fee_paid: payment.late_fee_paid || 0,
      notes: payment.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPayment) return;

    const { error } = await supabase
      .from("payments")
      .update({
        amount: editForm.amount,
        principal_paid: editForm.principal_paid,
        interest_paid: editForm.interest_paid,
        late_fee_paid: editForm.late_fee_paid,
        notes: editForm.notes || null,
      })
      .eq("id", editingPayment.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Payment updated successfully",
      });
      fetchPayments();
      setEditingPayment(null);
    }
  };

  const generateInvoiceNumber = (paymentId: string, date: string) => {
    const dateStr = new Date(date).toISOString().split('T')[0].replace(/-/g, '');
    return `INV-${dateStr}-${paymentId.slice(0, 6).toUpperCase()}`;
  };

  const printReceipt = (payment: Payment) => {
    const invoiceNumber = generateInvoiceNumber(payment.id, payment.payment_date);
    const date = new Date(payment.payment_date).toLocaleDateString();
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - Invoice #${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { color: #1a1a1a; margin: 0; font-size: 24px; }
          .header p { color: #666; margin: 5px 0 0 0; }
          .invoice-info { text-align: center; margin-bottom: 20px; }
          .invoice-info h2 { color: #22c55e; margin: 0; }
          .section { margin-bottom: 20px; }
          .section h3 { border-bottom: 1px solid #eee; padding-bottom: 5px; color: #333; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
          .total { background: #22c55e; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .total .row { border: none; font-size: 18px; font-weight: bold; }
          .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          .footer h3 { color: #22c55e; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Quality Foreign Domestic Autos</h1>
          <p>Professional Auto Sales & Service</p>
        </div>
        
        <div class="invoice-info">
          <h2>PAYMENT RECEIPT</h2>
          <p>Invoice #${invoiceNumber}</p>
          <p>Date: ${date}</p>
        </div>
        
        <div class="section">
          <h3>Customer Information</h3>
          <div class="row"><span>Name:</span><span>${payment.profile?.full_name || 'N/A'}</span></div>
          <div class="row"><span>Vehicle:</span><span>${payment.vehicle ? `${payment.vehicle.year} ${payment.vehicle.make} ${payment.vehicle.model}` : 'N/A'}</span></div>
        </div>
        
        <div class="section">
          <h3>Service Details</h3>
          <div class="row"><span>Principal Payment:</span><span>$${payment.principal_paid.toFixed(2)}</span></div>
          <div class="row"><span>Interest Payment:</span><span>$${payment.interest_paid.toFixed(2)}</span></div>
          ${payment.late_fee_paid && payment.late_fee_paid > 0 ? `<div class="row"><span>Late Fee:</span><span>$${payment.late_fee_paid.toFixed(2)}</span></div>` : ''}
          <div class="row"><span>Payment Method:</span><span>${payment.payment_method || 'Cash'}</span></div>
        </div>
        
        <div class="total">
          <div class="row"><span>TOTAL PAID:</span><span>$${payment.amount.toFixed(2)}</span></div>
        </div>
        
        ${payment.notes ? `<div class="section"><h3>Notes</h3><p>${payment.notes}</p></div>` : ''}
        
        <div class="footer">
          <h3>Thank You for Your Business!</h3>
          <p>Contact: 470-519-6717 | ramon@carsandclaims.com</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transactions Report
              </CardTitle>
              <CardDescription>View and manage payment transactions</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant={timeFilter === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter("day")}
              >
                Today
              </Button>
              <Button
                variant={timeFilter === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter("week")}
              >
                This Week
              </Button>
              <Button
                variant={timeFilter === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter("month")}
              >
                This Month
              </Button>
              <Select
                value={timeFilter === "prior_month" ? selectedPriorMonth : ""}
                onValueChange={(val) => {
                  setSelectedPriorMonth(val);
                  setTimeFilter("prior_month");
                }}
              >
                <SelectTrigger className={`w-[180px] h-9 text-sm ${timeFilter === "prior_month" ? "border-primary bg-primary text-primary-foreground" : ""}`}>
                  <SelectValue placeholder="Prior Month..." />
                </SelectTrigger>
                <SelectContent>
                  {getPriorMonthOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="font-medium">Total ({timeFilter === "day" ? "Today" : timeFilter === "week" ? "This Week" : timeFilter === "month" ? "This Month" : getPriorMonthOptions().find(o => o.value === selectedPriorMonth)?.label || "Prior Month"}):</span>
            </div>
            <span className="text-2xl font-bold text-primary">${getTotalAmount().toFixed(2)}</span>
          </div>

          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions found for this period</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {generateInvoiceNumber(payment.id, payment.payment_date)}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{payment.profile?.full_name || 'N/A'}</TableCell>
                      <TableCell>
                        {payment.vehicle 
                          ? `${payment.vehicle.year} ${payment.vehicle.make} ${payment.vehicle.model}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${payment.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.payment_method || 'Cash'}</Badge>
                      </TableCell>
                      <TableCell>
                        {payment.payment_method?.toLowerCase().includes('online') || 
                         (payment.created_by && payment.account_user_id && payment.created_by === payment.account_user_id) ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">Portal</Badge>
                        ) : (
                          <Badge variant="outline">Manual</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(payment)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => printReceipt(payment)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingPayment} onOpenChange={(open) => !open && setEditingPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Principal ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.principal_paid}
                  onChange={(e) => setEditForm(prev => ({ ...prev, principal_paid: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interest ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.interest_paid}
                  onChange={(e) => setEditForm(prev => ({ ...prev, interest_paid: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Late Fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.late_fee_paid}
                  onChange={(e) => setEditForm(prev => ({ ...prev, late_fee_paid: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingPayment(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
