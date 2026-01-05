import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Search, ExternalLink, FileText, Loader2, Calendar, Filter, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Invoice {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  vehicle_info: string | null;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface CustomerAccount {
  id: string;
  user_id: string;
  current_balance: number;
  principal_amount: number;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

const ITEMS_PER_PAGE = 10;

export const InvoiceHistory = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Add to account dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [addingToAccount, setAddingToAccount] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchCustomerAccounts();
  }, [statusFilter, dateFilter, currentPage]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("invoices")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply date filter
      if (dateFilter !== "all") {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case "quarter":
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
          case "year":
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte("created_at", startDate.toISOString());
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      
      setInvoices((data as Invoice[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerAccounts = async () => {
    try {
      // First fetch customer accounts
      const { data: accounts, error } = await supabase
        .from("customer_accounts")
        .select("id, user_id, current_balance, principal_amount")
        .eq("status", "active");

      if (error) throw error;
      if (!accounts || accounts.length === 0) {
        setCustomerAccounts([]);
        return;
      }

      // Get unique user IDs and fetch profiles separately
      const userIds = [...new Set(accounts.map(a => a.user_id))];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profileError) throw profileError;

      // Combine the data
      const combinedAccounts = accounts.map(acc => ({
        id: acc.id,
        user_id: acc.user_id,
        current_balance: acc.current_balance,
        principal_amount: acc.principal_amount,
        profile: profiles?.find(p => p.id === acc.user_id) || undefined
      }));
      
      setCustomerAccounts(combinedAccounts);
    } catch (error) {
      console.error("Error fetching customer accounts:", error);
    }
  };

  const handleAddToAccount = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSelectedAccountId("");
    setShowAddDialog(true);
  };

  const handleConfirmAddToAccount = async () => {
    if (!selectedInvoice || !selectedAccountId) return;

    setAddingToAccount(true);
    try {
      const account = customerAccounts.find(a => a.id === selectedAccountId);
      if (!account) throw new Error("Account not found");

      const newBalance = account.current_balance + selectedInvoice.total;
      
      const { error } = await supabase
        .from("customer_accounts")
        .update({
          current_balance: newBalance,
          principal_amount: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedAccountId);

      if (error) throw error;

      toast({
        title: "Account Updated",
        description: `$${selectedInvoice.total.toFixed(2)} added to customer's account balance.`,
      });

      // Refresh accounts
      fetchCustomerAccounts();
      setShowAddDialog(false);
      setSelectedInvoice(null);
      setSelectedAccountId("");
    } catch (error: any) {
      console.error("Error adding to account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update account balance",
        variant: "destructive",
      });
    } finally {
      setAddingToAccount(false);
    }
  };

  // Filter invoices by search term (client-side for current page)
  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      invoice.customer_name.toLowerCase().includes(search) ||
      invoice.customer_email.toLowerCase().includes(search) ||
      (invoice.vehicle_info?.toLowerCase().includes(search) ?? false) ||
      (invoice.customer_phone?.includes(search) ?? false)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500 hover:bg-green-600">Sent</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "paid":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const selectedAccount = customerAccounts.find(a => a.id === selectedAccountId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name, email, phone, or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">
                {invoices.filter(i => i.status === "sent").length}
              </p>
              <p className="text-sm text-muted-foreground">Sent</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">
                {invoices.filter(i => i.status === "paid").length}
              </p>
              <p className="text-sm text-muted-foreground">Paid</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold">
                {formatCurrency(invoices.reduce((sum, i) => sum + Number(i.total), 0))}
              </p>
              <p className="text-sm text-muted-foreground">Total Value (Page)</p>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden md:table-cell">Vehicle</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {format(new Date(invoice.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {invoice.vehicle_info || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddToAccount(invoice)}
                              title="Add to BHPH Account"
                            >
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/invoice-preview/${invoice.id}`, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => handlePageChange(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add to Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Invoice to BHPH Account</DialogTitle>
            <DialogDescription>
              Select a customer account to add this invoice amount to their balance.
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Invoice Total</p>
                <p className="text-2xl font-bold">{formatCurrency(selectedInvoice.total)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedInvoice.customer_name} • {format(new Date(selectedInvoice.created_at), "MMM d, yyyy")}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Select Customer Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customerAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.profile?.full_name || account.profile?.email || "Unknown"} — 
                        Balance: {formatCurrency(account.current_balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAccount && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="font-medium text-amber-800">Balance Update Preview</p>
                  <p className="text-sm text-amber-600 mt-1">
                    Current balance: {formatCurrency(selectedAccount.current_balance)} → 
                    New balance: {formatCurrency(selectedAccount.current_balance + selectedInvoice.total)}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAddToAccount}
              disabled={!selectedAccountId || addingToAccount}
            >
              {addingToAccount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add to Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
