import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Download, Printer, Calculator, DollarSign, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

interface CustomerStatement {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vehicle_info: string;
  total_principal_paid: number;
  total_interest_paid: number;
  total_late_fees_paid: number;
  total_payments: number;
  payment_count: number;
  starting_balance: number;
  ending_balance: number;
}

export const YearEndStatementHelper = () => {
  const { toast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [statements, setStatements] = useState<CustomerStatement[]>([]);
  const [totals, setTotals] = useState({
    totalPrincipal: 0,
    totalInterest: 0,
    totalLateFees: 0,
    totalPayments: 0,
    customerCount: 0,
  });

  const fetchYearEndData = async () => {
    setLoading(true);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      // Fetch all payments for the year
      const { data: payments, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          principal_paid,
          interest_paid,
          late_fee_paid,
          payment_date,
          account_id
        `)
        .gte("payment_date", startDate)
        .lte("payment_date", endDate)
        .order("payment_date", { ascending: true });

      if (error) throw error;

      if (!payments || payments.length === 0) {
        toast({
          title: "No payments found",
          description: `No payments recorded for ${year}`,
          variant: "destructive",
        });
        setStatements([]);
        setTotals({
          totalPrincipal: 0,
          totalInterest: 0,
          totalLateFees: 0,
          totalPayments: 0,
          customerCount: 0,
        });
        setLoading(false);
        return;
      }

      // Get unique account IDs
      const accountIds = [...new Set(payments.map((p) => p.account_id))];

      // Fetch account details
      const { data: accounts, error: accountsError } = await supabase
        .from("customer_accounts")
        .select(`
          id,
          user_id,
          principal_amount,
          current_balance,
          vehicle_id
        `)
        .in("id", accountIds);

      if (accountsError) throw accountsError;

      // Fetch user profiles for customer info
      const userIds = accounts?.filter(a => a.user_id).map(a => a.user_id) || [];
      let profilesMap: Record<string, { full_name: string; email: string; phone: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { 
              full_name: p.full_name || "Unknown", 
              email: p.email || "", 
              phone: p.phone || "" 
            };
            return acc;
          }, {} as Record<string, { full_name: string; email: string; phone: string }>);
        }
      }

      // Fetch vehicle info for each account
      const vehicleIds = accounts?.filter(a => a.vehicle_id).map(a => a.vehicle_id) || [];
      let vehiclesMap: Record<string, string> = {};
      
      if (vehicleIds.length > 0) {
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("id, year, make, model")
          .in("id", vehicleIds);
        
        if (vehicles) {
          vehiclesMap = vehicles.reduce((acc, v) => {
            acc[v.id] = `${v.year} ${v.make} ${v.model}`;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Build statements per customer
      const customerStatements: CustomerStatement[] = [];
      
      for (const account of accounts || []) {
        const accountPayments = payments.filter((p) => p.account_id === account.id);
        
        if (accountPayments.length === 0) continue;

        const totalPrincipal = accountPayments.reduce((sum, p) => sum + (Number(p.principal_paid) || 0), 0);
        const totalInterest = accountPayments.reduce((sum, p) => sum + (Number(p.interest_paid) || 0), 0);
        const totalLateFees = accountPayments.reduce((sum, p) => sum + (Number(p.late_fee_paid) || 0), 0);
        const totalPaymentsAmount = accountPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const profile = account.user_id ? profilesMap[account.user_id] : null;

        customerStatements.push({
          customer_name: profile?.full_name || "Unknown",
          customer_email: profile?.email || "",
          customer_phone: profile?.phone || "",
          vehicle_info: account.vehicle_id ? vehiclesMap[account.vehicle_id] || "N/A" : "N/A",
          total_principal_paid: totalPrincipal,
          total_interest_paid: totalInterest,
          total_late_fees_paid: totalLateFees,
          total_payments: totalPaymentsAmount,
          payment_count: accountPayments.length,
          starting_balance: account.principal_amount || 0,
          ending_balance: account.current_balance || 0,
        });
      }

      // Sort by customer name
      customerStatements.sort((a, b) => a.customer_name.localeCompare(b.customer_name));

      // Calculate totals
      const totalsCalc = {
        totalPrincipal: customerStatements.reduce((sum, s) => sum + s.total_principal_paid, 0),
        totalInterest: customerStatements.reduce((sum, s) => sum + s.total_interest_paid, 0),
        totalLateFees: customerStatements.reduce((sum, s) => sum + s.total_late_fees_paid, 0),
        totalPayments: customerStatements.reduce((sum, s) => sum + s.total_payments, 0),
        customerCount: customerStatements.length,
      };

      setStatements(customerStatements);
      setTotals(totalsCalc);
      
      toast({
        title: "Year-end data loaded",
        description: `Found ${customerStatements.length} customers with payments in ${year}`,
      });
    } catch (error) {
      console.error("Error fetching year-end data:", error);
      toast({
        title: "Error loading data",
        description: "Failed to fetch year-end statements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const printStatements = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Popup blocked",
        description: "Please allow popups to print statements",
        variant: "destructive",
      });
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Year-End Statements ${year} - Cars and Claims</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { margin: 0; color: #1a1a1a; }
            .header p { color: #666; margin-top: 5px; }
            .summary { background: #f5f5f5; padding: 20px; margin-bottom: 30px; border-radius: 8px; }
            .summary h2 { margin-top: 0; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .summary-item { text-align: center; }
            .summary-item .value { font-size: 24px; font-weight: bold; color: #2563eb; }
            .summary-item .label { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f0f0f0; font-weight: bold; }
            .money { text-align: right; font-family: monospace; }
            .total-row { background: #e8f4e8; font-weight: bold; }
            .customer-statement { page-break-inside: avoid; margin-bottom: 40px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            .customer-header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
            .customer-name { font-size: 18px; font-weight: bold; }
            .customer-details { color: #666; font-size: 14px; }
            .statement-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .statement-item { background: #f9f9f9; padding: 10px; border-radius: 4px; }
            .statement-item .value { font-size: 18px; font-weight: bold; }
            .statement-item .label { font-size: 12px; color: #666; }
            @media print {
              .no-print { display: none; }
              .customer-statement { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Quality Foreign and Domestic Auto's</h1>
            <p>Year-End Financial Statement - ${year}</p>
            <p>Generated on ${format(new Date(), "MMMM d, yyyy")}</p>
          </div>

          <div class="summary">
            <h2>Annual Summary</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="value">${totals.customerCount}</div>
                <div class="label">Active Customers</div>
              </div>
              <div class="summary-item">
                <div class="value">$${totals.totalPrincipal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                <div class="label">Total Principal Collected</div>
              </div>
              <div class="summary-item">
                <div class="value">$${totals.totalInterest.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                <div class="label">Total Interest Collected</div>
              </div>
              <div class="summary-item">
                <div class="value">$${totals.totalPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                <div class="label">Total Payments Received</div>
              </div>
            </div>
          </div>

          <h2>Customer Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Vehicle</th>
                <th class="money">Principal Paid</th>
                <th class="money">Interest Paid</th>
                <th class="money">Late Fees</th>
                <th class="money">Total Paid</th>
                <th style="text-align: center;"># Payments</th>
              </tr>
            </thead>
            <tbody>
              ${statements.map((s) => `
                <tr>
                  <td>${s.customer_name}</td>
                  <td>${s.vehicle_info}</td>
                  <td class="money">$${s.total_principal_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td class="money">$${s.total_interest_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td class="money">$${s.total_late_fees_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td class="money">$${s.total_payments.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td style="text-align: center;">${s.payment_count}</td>
                </tr>
              `).join("")}
              <tr class="total-row">
                <td colspan="2"><strong>TOTALS</strong></td>
                <td class="money">$${totals.totalPrincipal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td class="money">$${totals.totalInterest.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td class="money">$${totals.totalLateFees.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td class="money">$${totals.totalPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <h2>Individual Customer Statements</h2>
          ${statements.map((s) => `
            <div class="customer-statement">
              <div class="customer-header">
                <div class="customer-name">${s.customer_name}</div>
                <div class="customer-details">
                  ${s.customer_email ? `Email: ${s.customer_email}` : ""} 
                  ${s.customer_phone ? `| Phone: ${s.customer_phone}` : ""}
                  <br/>Vehicle: ${s.vehicle_info}
                </div>
              </div>
              <div class="statement-grid">
                <div class="statement-item">
                  <div class="label">Total Payments Made</div>
                  <div class="value">${s.payment_count}</div>
                </div>
                <div class="statement-item">
                  <div class="label">Principal Paid</div>
                  <div class="value">$${s.total_principal_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="statement-item">
                  <div class="label">Interest Paid</div>
                  <div class="value">$${s.total_interest_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="statement-item">
                  <div class="label">Late Fees Paid</div>
                  <div class="value">$${s.total_late_fees_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="statement-item">
                  <div class="label">Total Amount Paid</div>
                  <div class="value" style="color: #16a34a;">$${s.total_payments.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="statement-item">
                  <div class="label">Current Balance</div>
                  <div class="value">$${s.ending_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>
          `).join("")}

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
            <p>Quality Foreign and Domestic Auto's | Cars and Claims</p>
            <p>This statement is for informational purposes only.</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const exportCSV = () => {
    if (statements.length === 0) {
      toast({
        title: "No data to export",
        description: "Generate statements first",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Customer Name",
      "Email",
      "Phone",
      "Vehicle",
      "Principal Paid",
      "Interest Paid",
      "Late Fees Paid",
      "Total Paid",
      "Payment Count",
      "Starting Balance",
      "Ending Balance",
    ];

    const rows = statements.map((s) => [
      s.customer_name,
      s.customer_email,
      s.customer_phone,
      s.vehicle_info,
      s.total_principal_paid.toFixed(2),
      s.total_interest_paid.toFixed(2),
      s.total_late_fees_paid.toFixed(2),
      s.total_payments.toFixed(2),
      s.payment_count.toString(),
      s.starting_balance.toFixed(2),
      s.ending_balance.toFixed(2),
    ]);

    // Add totals row
    rows.push([
      "TOTALS",
      "",
      "",
      "",
      totals.totalPrincipal.toFixed(2),
      totals.totalInterest.toFixed(2),
      totals.totalLateFees.toFixed(2),
      totals.totalPayments.toFixed(2),
      "",
      "",
      "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `year-end-statements-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "CSV exported",
      description: `Saved as year-end-statements-${year}.csv`,
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Year-End Statement Helper
          </CardTitle>
          <CardDescription>
            Generate annual financial statements for all BHPH customers with payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="year-select">Select Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year-select">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchYearEndData} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Statements
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {statements.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Users className="h-4 w-4" />
                  Customers
                </div>
                <div className="text-2xl font-bold">{totals.customerCount}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  Principal
                </div>
                <div className="text-2xl font-bold text-primary">
                  ${totals.totalPrincipal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  Interest
                </div>
                <div className="text-2xl font-bold">
                  ${totals.totalInterest.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  Late Fees
                </div>
                <div className="text-2xl font-bold">
                  ${totals.totalLateFees.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  Total Collected
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ${totals.totalPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={printStatements}>
              <Printer className="mr-2 h-4 w-4" />
              Print Statements
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Customer Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Breakdown - {year}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Late Fees</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                      <TableHead className="text-center"># Payments</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statements.map((statement, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{statement.customer_name}</TableCell>
                        <TableCell className="text-muted-foreground">{statement.vehicle_info}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${statement.total_principal_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${statement.total_interest_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${statement.total_late_fees_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-green-600">
                          ${statement.total_payments.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">{statement.payment_count}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${statement.ending_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>TOTALS</TableCell>
                      <TableCell className="text-right font-mono">
                        ${totals.totalPrincipal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${totals.totalInterest.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${totals.totalLateFees.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        ${totals.totalPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
