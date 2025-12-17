import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, Printer } from "lucide-react";
import logo from "@/assets/cars-claims-logo-new.jpg";

interface Payment {
  id: string;
  amount: number;
  principal_paid: number;
  interest_paid: number;
  late_fee_paid: number;
  payment_date: string;
  payment_method: string;
  notes: string;
  account: {
    user_id: string;
    current_balance: number;
    vehicle: {
      year: number;
      make: string;
      model: string;
    } | null;
  };
  profile: {
    full_name: string;
    email: string;
  } | null;
}

const BatchReceiptExport = () => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const fetchPayments = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Date Range Required",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch payments within date range
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          principal_paid,
          interest_paid,
          late_fee_paid,
          payment_date,
          payment_method,
          notes,
          account_id
        `)
        .gte("payment_date", startDate)
        .lte("payment_date", endDate + "T23:59:59")
        .order("payment_date", { ascending: true });

      if (paymentsError) throw paymentsError;

      if (!paymentsData || paymentsData.length === 0) {
        toast({
          title: "No Payments Found",
          description: "No payments found in the selected date range.",
        });
        setPayments([]);
        return;
      }

      // Get unique account IDs
      const accountIds = [...new Set(paymentsData.map(p => p.account_id))];

      // Fetch accounts with vehicle info
      const { data: accountsData } = await supabase
        .from("customer_accounts")
        .select(`
          id,
          user_id,
          current_balance,
          vehicles (year, make, model)
        `)
        .in("id", accountIds);

      // Create account map
      const accountMap = new Map(accountsData?.map(a => [a.id, a]) || []);

      // Get user IDs for profiles
      const userIds = [...new Set(accountsData?.map(a => a.user_id) || [])];

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combine data
      const enrichedPayments: Payment[] = paymentsData.map(payment => {
        const account = accountMap.get(payment.account_id);
        const profile = account ? profileMap.get(account.user_id) : null;
        
        return {
          id: payment.id,
          amount: payment.amount,
          principal_paid: payment.principal_paid,
          interest_paid: payment.interest_paid,
          late_fee_paid: payment.late_fee_paid || 0,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method || "Cash",
          notes: payment.notes || "",
          account: {
            user_id: account?.user_id || "",
            current_balance: account?.current_balance || 0,
            vehicle: account?.vehicles as { year: number; make: string; model: string } | null,
          },
          profile: profile ? {
            full_name: profile.full_name || "Unknown",
            email: profile.email || "",
          } : null,
        };
      });

      setPayments(enrichedPayments);
      setShowPreview(true);

      toast({
        title: "Receipts Generated",
        description: `Found ${enrichedPayments.length} payments ready for export.`,
      });
    } catch (error: any) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch payments.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = (paymentId: string, date: string) => {
    const dateStr = new Date(date).toISOString().split("T")[0].replace(/-/g, "");
    return `INV-${dateStr}-${paymentId.slice(0, 5).toUpperCase()}`;
  };

  const printReceipts = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const receiptsHtml = payments.map((payment, index) => `
      <div class="receipt ${index < payments.length - 1 ? 'page-break' : ''}">
        <div class="header">
          <img src="${logo}" alt="Logo" class="logo" />
          <h1>Quality Foreign and Domestic Auto's</h1>
          <p class="subtitle">Cars & Claims</p>
          <p class="contact">Phone: 470-519-6717</p>
        </div>

        <div class="title-section">
          <h2>PAYMENT RECEIPT</h2>
          <p>Invoice #: ${generateInvoiceNumber(payment.id, payment.payment_date)}</p>
          <p>Date: ${new Date(payment.payment_date).toLocaleDateString()}</p>
        </div>

        <div class="customer-info">
          <h3>Bill To:</h3>
          <p class="customer-name">${payment.profile?.full_name || "Unknown"}</p>
          <p class="customer-email">${payment.profile?.email || ""}</p>
          ${payment.account.vehicle ? `<p class="vehicle">Vehicle: ${payment.account.vehicle.year} ${payment.account.vehicle.make} ${payment.account.vehicle.model}</p>` : ""}
        </div>

        <div class="details">
          <h3>Payment Details</h3>
          <table>
            <tr>
              <td>Payment Method:</td>
              <td class="right">${payment.payment_method}</td>
            </tr>
            <tr>
              <td>Principal Paid:</td>
              <td class="right">$${payment.principal_paid.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Interest Paid:</td>
              <td class="right">$${payment.interest_paid.toFixed(2)}</td>
            </tr>
            ${payment.late_fee_paid > 0 ? `
            <tr>
              <td>Late Fee Paid:</td>
              <td class="right">$${payment.late_fee_paid.toFixed(2)}</td>
            </tr>
            ` : ""}
            <tr class="total-row">
              <td>Total Payment:</td>
              <td class="right total">$${payment.amount.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        ${payment.notes ? `
        <div class="notes">
          <p><strong>Notes:</strong> ${payment.notes}</p>
        </div>
        ` : ""}

        <div class="footer">
          <p class="thank-you">Thank you for your payment!</p>
          <p>Quality Foreign and Domestic Auto's - Cars & Claims</p>
          <p>Your trusted partner in automotive financing</p>
        </div>
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Batch Payment Receipts - ${startDate} to ${endDate}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #333; }
          .receipt { max-width: 650px; margin: 0 auto; padding: 40px; }
          .page-break { page-break-after: always; }
          
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 25px; }
          .logo { height: 80px; margin-bottom: 10px; }
          .header h1 { font-size: 22px; margin-bottom: 5px; }
          .subtitle { font-size: 14px; color: #666; }
          .contact { font-size: 12px; color: #666; margin-top: 5px; }
          
          .title-section { text-align: center; margin-bottom: 25px; }
          .title-section h2 { font-size: 18px; margin-bottom: 10px; }
          .title-section p { font-size: 12px; color: #666; }
          
          .customer-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 25px; }
          .customer-info h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
          .customer-name { font-size: 16px; font-weight: bold; }
          .customer-email, .vehicle { font-size: 12px; color: #666; }
          
          .details { margin-bottom: 25px; }
          .details h3 { font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; }
          .details table { width: 100%; }
          .details td { padding: 8px 0; border-bottom: 1px solid #eee; }
          .details .right { text-align: right; font-weight: 500; }
          .details .total-row { border-top: 2px solid #333; border-bottom: none; }
          .details .total-row td { padding-top: 12px; font-weight: bold; }
          .details .total { font-size: 18px; }
          
          .notes { background: #fffbeb; border: 1px solid #fcd34d; padding: 12px; border-radius: 5px; margin-bottom: 25px; font-size: 12px; }
          
          .footer { text-align: center; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666; }
          .thank-you { font-weight: bold; margin-bottom: 5px; }
          
          @media print {
            body { background: white; }
            .receipt { padding: 20px; }
          }
        </style>
      </head>
      <body>
        ${receiptsHtml}
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Batch Receipt Export
        </CardTitle>
        <CardDescription>
          Generate and print receipts for all payments within a date range
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchPayments} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Receipts
                </>
              )}
            </Button>
          </div>
        </div>

        {showPreview && payments.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">{payments.length} receipts ready</p>
                <p className="text-sm text-muted-foreground">
                  Total: ${payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
              </div>
              <Button onClick={printReceipts}>
                <Printer className="h-4 w-4 mr-2" />
                Print All / Save as PDF
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-right p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-t">
                      <td className="p-2">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="p-2">{payment.profile?.full_name || "Unknown"}</td>
                      <td className="p-2 text-right font-medium">${payment.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchReceiptExport;
