import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Pencil, Trash2, DollarSign, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AccountReceivable {
  id: string;
  customer_name: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  status: string;
  created_at: string;
}

export const AccountsReceivable = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountReceivable | null>(null);
  const [formData, setFormData] = useState({
    customer_name: "",
    description: "",
    amount: "",
    due_date: "",
    status: "pending",
  });

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("accounts_receivable")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading accounts", description: error.message, variant: "destructive" });
    } else {
      setAccounts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      customer_name: formData.customer_name,
      description: formData.description || null,
      amount: parseFloat(formData.amount),
      due_date: formData.due_date || null,
      status: formData.status,
    };

    if (editingAccount) {
      const { error } = await supabase
        .from("accounts_receivable")
        .update(payload)
        .eq("id", editingAccount.id);

      if (error) {
        toast({ title: "Error updating account", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Account updated successfully" });
    } else {
      const { error } = await supabase.from("accounts_receivable").insert(payload);

      if (error) {
        toast({ title: "Error adding account", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Account added successfully" });
    }

    resetForm();
    fetchAccounts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("accounts_receivable").delete().eq("id", id);

    if (error) {
      toast({ title: "Error deleting account", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Account deleted" });
    fetchAccounts();
  };

  const resetForm = () => {
    setFormData({ customer_name: "", description: "", amount: "", due_date: "", status: "pending" });
    setEditingAccount(null);
    setDialogOpen(false);
  };

  const openEditDialog = (account: AccountReceivable) => {
    setEditingAccount(account);
    setFormData({
      customer_name: account.customer_name,
      description: account.description || "",
      amount: account.amount.toString(),
      due_date: account.due_date || "",
      status: account.status,
    });
    setDialogOpen(true);
  };

  const totalPending = accounts.filter(a => a.status === "pending").reduce((sum, a) => sum + a.amount, 0);
  const totalPaid = accounts.filter(a => a.status === "paid").reduce((sum, a) => sum + a.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Accounts Receivable
            </CardTitle>
            <CardDescription>Track money owed to your business</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingAccount(null); setFormData({ customer_name: "", description: "", amount: "", due_date: "", status: "pending" }); }}>
                <Plus className="mr-2 h-4 w-4" /> Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Edit Account" : "Add New Account Receivable"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">{editingAccount ? "Update" : "Add"}</Button>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-green-600">${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Collected</p>
            <p className="text-2xl font-bold text-blue-600">${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between py-2 mb-2">
              <span className="text-sm font-medium">View Details ({accounts.length} items)</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No accounts receivable yet
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.customer_name}</TableCell>
                      <TableCell>{account.description || "-"}</TableCell>
                      <TableCell>${account.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{account.due_date ? new Date(account.due_date + 'T00:00:00').toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          account.status === 'paid' ? 'bg-green-100 text-green-800' :
                          account.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          account.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {account.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(account)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(account.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
