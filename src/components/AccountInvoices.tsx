import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Invoice {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  created_at: string;
  vehicle_info: string | null;
  notes: string | null;
}

interface AccountInvoicesProps {
  accountId: string;
  customerEmail: string;
}

export const AccountInvoices = ({ accountId, customerEmail }: AccountInvoicesProps) => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [accountId, customerEmail]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      // Fetch invoices linked to this customer account or by email
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .or(`customer_id.eq.${accountId},customer_email.eq.${customerEmail}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500">Sent</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Account Invoices</CardTitle>
            <CardDescription>View all invoices associated with your account</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No invoices found for your account</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {formatDate(invoice.created_at)}
                    </TableCell>
                    <TableCell>
                      <div>
                        {invoice.vehicle_info && (
                          <span className="text-sm">{invoice.vehicle_info}</span>
                        )}
                        {invoice.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {invoice.notes}
                          </p>
                        )}
                        {!invoice.vehicle_info && !invoice.notes && (
                          <span className="text-muted-foreground">Invoice</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/invoice/${invoice.id}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {invoices.length > 0 && (
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Total: {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </span>
            <span className="font-semibold">
              Total Amount: ${invoices.reduce((sum, inv) => sum + inv.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
