import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Save, X, Upload, Download, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO, startOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useDropdownOptions } from "@/hooks/useDropdownOptions";
import { DropdownOptionsManager } from "./DropdownOptionsManager";

interface Expense {
  id: string;
  amount: number;
  description: string | null;
  debtor: string | null;
  transaction_type: string;
  category: string;
  expense_date: string;
  created_at: string;
  payment_method: string | null;
  classification: string | null;
  vendor: string | null;
}

export const ExpensesTracker = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isChartsExpanded, setIsChartsExpanded] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const { vendors, classifications, paymentMethods } = useDropdownOptions();
  
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    debtor: "",
    transaction_type: "expenses",
    category: "business",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "",
    classification: "",
    vendor: "",
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("expenses").insert({
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        debtor: formData.debtor || null,
        transaction_type: formData.transaction_type,
        category: formData.category,
        expense_date: formData.expense_date,
        payment_method: formData.payment_method || null,
        classification: formData.classification || null,
        vendor: formData.vendor || null,
        created_by: userData.user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense added successfully",
      });

      setFormData({
        amount: "",
        description: "",
        debtor: "",
        transaction_type: "expenses",
        category: "business",
        expense_date: format(new Date(), "yyyy-MM-dd"),
        payment_method: "",
        classification: "",
        vendor: "",
      });
      setShowAddForm(false);
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateExpense = async (id: string) => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          debtor: formData.debtor || null,
          transaction_type: formData.transaction_type,
          category: formData.category,
          expense_date: formData.expense_date,
          payment_method: formData.payment_method || null,
          classification: formData.classification || null,
          vendor: formData.vendor || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense updated successfully",
      });

      setEditingId(null);
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });

      fetchExpenses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const headers = "Date,Amount,Debtor,Transaction Type,Category,Payment Method,Classification,Description";
    const sampleRow = "2024-01-15,100.00,John Doe,expenses,business,Cash,Operating Expense,Office supplies";
    const csvContent = `${headers}\n${sampleRow}`;
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV file must have at least a header row and one data row");
      }

      const { data: userData } = await supabase.auth.getUser();
      const expenses: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        
        if (values.length < 5) continue;

        const [date, amount, debtor, transactionType, category, paymentMethod, classification, description] = values;
        
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) continue;

        const validTransactionTypes = ["revenue", "expenses", "taxes"];
        const validCategories = ["business", "personal"];
        
        expenses.push({
          expense_date: date || format(new Date(), "yyyy-MM-dd"),
          amount: parsedAmount,
          debtor: debtor || null,
          transaction_type: validTransactionTypes.includes(transactionType?.toLowerCase()) 
            ? transactionType.toLowerCase() 
            : "expenses",
          category: validCategories.includes(category?.toLowerCase()) 
            ? category.toLowerCase() 
            : "business",
          payment_method: paymentMethod || null,
          classification: classification || null,
          description: description || null,
          created_by: userData.user?.id,
        });
      }

      if (expenses.length === 0) {
        throw new Error("No valid expenses found in the CSV file");
      }

      const { error } = await supabase.from("expenses").insert(expenses);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${expenses.length} expenses successfully`,
      });

      fetchExpenses();
    } catch (error: any) {
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const startEditing = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      amount: expense.amount.toString(),
      description: expense.description || "",
      debtor: expense.debtor || "",
      transaction_type: expense.transaction_type,
      category: expense.category,
      expense_date: expense.expense_date,
      payment_method: expense.payment_method || "",
      classification: expense.classification || "",
      vendor: expense.vendor || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({
      amount: "",
      description: "",
      debtor: "",
      transaction_type: "expenses",
      category: "business",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "",
      classification: "",
      vendor: "",
    });
  };

  // Calculate summaries
  const totalRevenue = expenses
    .filter((e) => e.transaction_type === "revenue")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalExpenses = expenses
    .filter((e) => e.transaction_type === "expenses")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalTaxes = expenses
    .filter((e) => e.transaction_type === "taxes")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const businessTotal = expenses
    .filter((e) => e.category === "business")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const personalTotal = expenses
    .filter((e) => e.category === "personal")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Chart data - group by month
  const monthlyData = useMemo(() => {
    const grouped: Record<string, { month: string; revenue: number; expenses: number; taxes: number }> = {};
    
    expenses.forEach((expense) => {
      const monthKey = format(startOfMonth(parseISO(expense.expense_date)), "yyyy-MM");
      const monthLabel = format(parseISO(expense.expense_date), "MMM yyyy");
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = { month: monthLabel, revenue: 0, expenses: 0, taxes: 0 };
      }
      
      if (expense.transaction_type === "revenue") {
        grouped[monthKey].revenue += Number(expense.amount);
      } else if (expense.transaction_type === "expenses") {
        grouped[monthKey].expenses += Number(expense.amount);
      } else if (expense.transaction_type === "taxes") {
        grouped[monthKey].taxes += Number(expense.amount);
      }
    });
    
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => data);
  }, [expenses]);

  // Pie chart data for category breakdown
  const categoryData = useMemo(() => [
    { name: "Business", value: businessTotal, color: "#3b82f6" },
    { name: "Personal", value: personalTotal, color: "#a855f7" },
  ].filter(item => item.value > 0), [businessTotal, personalTotal]);

  // Pie chart data for transaction type breakdown
  const typeData = useMemo(() => [
    { name: "Revenue", value: totalRevenue, color: "#22c55e" },
    { name: "Expenses", value: totalExpenses, color: "#ef4444" },
    { name: "Taxes", value: totalTaxes, color: "#f97316" },
  ].filter(item => item.value > 0), [totalRevenue, totalExpenses, totalTaxes]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              ${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Taxes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              ${totalTaxes.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Business</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              ${businessTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              ${personalTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Collapsible */}
      {expenses.length > 0 && (
        <Collapsible open={isChartsExpanded} onOpenChange={setIsChartsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full flex items-center justify-between py-3 mb-2">
              <span className="font-medium">View Charts & Analytics</span>
              {isChartsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Monthly Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue vs Expenses Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, ""]}
                        contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="taxes" name="Taxes" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Line Chart for Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, ""]}
                        contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444" }} />
                      <Line type="monotone" dataKey="taxes" name="Taxes" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transaction Type Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Type Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business vs Personal</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Add Expense Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle>Daily Tracker</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {!showAddForm && (
              <>
                <DropdownOptionsManager />
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <label htmlFor="csv-upload">
                  <Button variant="outline" asChild disabled={importing}>
                    <span className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {importing ? "Importing..." : "Import CSV"}
                    </span>
                  </Button>
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={importing}
                />
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-muted/30">
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="debtor">Debtor</Label>
                <Input
                  id="debtor"
                  value={formData.debtor}
                  onChange={(e) => setFormData({ ...formData, debtor: e.target.value })}
                  placeholder="Enter debtor name"
                />
              </div>
              <div>
                <Label htmlFor="transaction_type">Transaction Type</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expenses">Expenses</SelectItem>
                    <SelectItem value="taxes">Taxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expense_date">Date</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="classification">Classification</Label>
                <Select
                  value={formData.classification}
                  onValueChange={(value) => setFormData({ ...formData, classification: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select classification" />
                  </SelectTrigger>
                  <SelectContent>
                    {classifications.map((cls) => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <Select
                  value={formData.vendor}
                  onValueChange={(value) => setFormData({ ...formData, vendor: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description"
                />
              </div>
              <div className="md:col-span-5 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleAddExpense}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Entry
                </Button>
              </div>
            </div>
          )}

          {/* Expenses Table - Collapsible */}
          <Collapsible open={isTableExpanded} onOpenChange={setIsTableExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between py-2 mb-2">
                <span className="text-sm font-medium">View Entries ({expenses.length} items)</span>
                {isTableExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-md border">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Debtor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No expenses recorded yet. Click "Add Entry" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) =>
                    editingId === expense.id ? (
                      <TableRow key={expense.id} className="bg-muted/30">
                        <TableCell>
                          <Input
                            type="date"
                            value={formData.expense_date}
                            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={formData.debtor}
                            onChange={(e) => setFormData({ ...formData, debtor: e.target.value })}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={formData.transaction_type}
                            onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="revenue">Revenue</SelectItem>
                              <SelectItem value="expenses">Expenses</SelectItem>
                              <SelectItem value="taxes">Taxes</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="business">Business</SelectItem>
                              <SelectItem value="personal">Personal</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={formData.payment_method}
                            onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods.map((method) => (
                                <SelectItem key={method} value={method}>{method}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={formData.classification}
                            onValueChange={(value) => setFormData({ ...formData, classification: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {classifications.map((cls) => (
                                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={formData.vendor}
                            onValueChange={(value) => setFormData({ ...formData, vendor: value })}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendors.map((v) => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-40"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" onClick={() => handleUpdateExpense(expense.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={expense.id}>
                        <TableCell>{format(new Date(expense.expense_date), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="font-medium">
                          ${Number(expense.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{expense.debtor || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              expense.transaction_type === "revenue"
                                ? "bg-green-100 text-green-700"
                                : expense.transaction_type === "taxes"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {expense.transaction_type.charAt(0).toUpperCase() + expense.transaction_type.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              expense.category === "business"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>{expense.payment_method || "-"}</TableCell>
                        <TableCell>{expense.vendor || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{expense.classification || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{expense.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => startEditing(expense)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
              </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};
