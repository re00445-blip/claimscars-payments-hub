import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPhoneE164 } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, ArrowLeft, Edit, Trash2, Mail, Eye, Users, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AccountDetailView } from "@/components/admin/AccountDetailView";

interface CustomerAccount {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  principal_amount: number;
  current_balance: number;
  interest_rate: number;
  /**
   * "percentage" => APR (%), "flat_fee" => flat monthly fee ($/mo)
   * Stored on the account so we can render correctly in the table.
   */
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

const AdminAccounts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CustomerAccount | null>(null);
  const [saving, setSaving] = useState(false);
  
  
  // Email change dialog state
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  const [emailChangeAccount, setEmailChangeAccount] = useState<CustomerAccount | null>(null);
  const [newEmail, setNewEmail] = useState("");
  
  // Account detail view state
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CustomerAccount | null>(null);

  const handleViewAccount = (account: CustomerAccount) => {
    setSelectedAccount(account);
    setDetailViewOpen(true);
  };
  const [changingEmail, setChangingEmail] = useState(false);

  const [formData, setFormData] = useState({
    // Customer info (manual entry)
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    // Vehicle info (manual entry)
    vehicle_year: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_vin: "",
    // Account details
    principal_amount: 0,
    down_payment: 0,
    flat_fee_amount: 0,
    current_balance: 0,
    interest_rate: 18,
    interest_rate_type: "percentage" as "percentage" | "flat_fee", // percentage APR, or flat fee ($/mo)
    payment_amount: 0,
    next_payment_date: "",
    late_fee_amount: 25,
    status: "active",
    payment_frequency: "monthly",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setCurrentUserEmail(session.user.email || null);
        checkAdminStatus(session.user.id);
      }
      setLoading(false);
    });
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
    const { data: accountsData } = await supabase
      .from("customer_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (accountsData) {
      const accountsWithDetails = await Promise.all(
        accountsData.map(async (account) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, phone, address")
            .eq("id", account.user_id)
            .maybeSingle();

          let vehicle = null;
          if (account.vehicle_id) {
            const { data: vehicleData } = await supabase
              .from("vehicles")
              .select("year, make, model, vin")
              .eq("id", account.vehicle_id)
              .maybeSingle();
            vehicle = vehicleData;
          }

          return { ...account, profile, vehicle };
        })
      );
      setAccounts(accountsWithDetails);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      customer_address: "",
      vehicle_year: "",
      vehicle_make: "",
      vehicle_model: "",
      vehicle_vin: "",
      principal_amount: 0,
      down_payment: 0,
      flat_fee_amount: 0,
      current_balance: 0,
      interest_rate: 18,
      interest_rate_type: "percentage",
      payment_amount: 0,
      next_payment_date: "",
      late_fee_amount: 25,
      status: "active",
      payment_frequency: "monthly",
    });
    setEditingAccount(null);
  };

  const handleEdit = (account: CustomerAccount) => {
    setEditingAccount(account);

    const storedRate = Number(account.interest_rate) || 0;
    const storedType =
      account.interest_rate_type === "flat_fee" || account.interest_rate_type === "percentage"
        ? (account.interest_rate_type as "flat_fee" | "percentage")
        : null;

    // Prefer the explicit stored type; fall back to legacy heuristic if missing.
    const isFlatFee = storedType
      ? storedType === "flat_fee"
      : (() => {
          const principal = account.principal_amount;
          const months = 36;
          const expectedFlatFeePayment = principal / months + storedRate;
          return storedRate >= 10 && Math.abs(account.payment_amount - expectedFlatFeePayment) < 1;
        })();

    setFormData({
      customer_name: account.profile?.full_name || "",
      customer_email: account.profile?.email || "",
      customer_phone: account.profile?.phone || "",
      customer_address: account.profile?.address || "",
      vehicle_year: account.vehicle?.year?.toString() || "",
      vehicle_make: account.vehicle?.make || "",
      vehicle_model: account.vehicle?.model || "",
      vehicle_vin: account.vehicle?.vin || "",
      principal_amount: account.principal_amount,
      down_payment: 0,
      flat_fee_amount: isFlatFee ? storedRate : 0,
      current_balance: account.current_balance,
      interest_rate: isFlatFee ? 18 : storedRate,
      interest_rate_type: isFlatFee ? "flat_fee" : "percentage",
      payment_amount: account.payment_amount,
      next_payment_date: account.next_payment_date,
      late_fee_amount: account.late_fee_amount || 25,
      status: account.status || "active",
      payment_frequency: account.payment_frequency || "monthly",
    });
    setIsDialogOpen(true);
  };

  const calculateMonthlyPayment = () => {
    const principal = formData.principal_amount;
    const months = 36;

    if (formData.interest_rate_type === "flat_fee") {
      // Flat fee - add flat fee per month to principal divided by months
      const principalPerMonth = principal / months;
      const payment = principalPerMonth + formData.flat_fee_amount;
      setFormData(prev => ({ ...prev, payment_amount: Math.round(payment * 100) / 100 }));
      return;
    }

    // Percentage rate calculation
    const rate = formData.interest_rate / 100 / 12;
    if (principal > 0 && rate > 0) {
      const payment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
      setFormData(prev => ({ ...prev, payment_amount: Math.round(payment * 100) / 100 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least phone or email is provided
    if (!formData.customer_phone && !formData.customer_email) {
      toast({
        title: "Validation Error",
        description: "Please provide either a phone number or email address",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);

    try {
      // For new accounts, use the edge function to create user properly
      if (!editingAccount) {
        const { data: sessionData } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-customer-account`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session?.access_token}`,
            },
            body: JSON.stringify({
              customer_name: formData.customer_name,
              customer_email: formData.customer_email,
              customer_phone: formatPhoneE164(formData.customer_phone),
              customer_address: formData.customer_address,
              vehicle_year: formData.vehicle_year,
              vehicle_make: formData.vehicle_make,
              vehicle_model: formData.vehicle_model,
              vehicle_vin: formData.vehicle_vin,
              principal_amount: formData.principal_amount,
              current_balance: formData.current_balance,
              // For flat fee, store the flat fee amount in interest_rate field
              interest_rate: formData.interest_rate_type === "flat_fee" ? formData.flat_fee_amount : formData.interest_rate,
              interest_rate_type: formData.interest_rate_type,
              payment_amount: formData.payment_amount,
              next_payment_date: formData.next_payment_date,
              late_fee_amount: formData.late_fee_amount,
              status: formData.status,
              payment_frequency: formData.payment_frequency,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create account");
        }

        // Show credentials if generated
        let description = "Account created successfully";
        if (result.generatedEmail || result.generatedPassword) {
          description = `Account created! ${result.generatedEmail ? `Email: ${result.generatedEmail}` : ""} ${result.generatedPassword ? `Password: ${result.generatedPassword}` : ""}`;
        }

        toast({
          title: "Success",
          description,
        });
      } else {
        // For editing, update the profile, vehicle (if linked), and account directly
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.customer_name,
            email: formData.customer_email,
            phone: formatPhoneE164(formData.customer_phone),
            address: formData.customer_address,
          })
          .eq("id", editingAccount.user_id);

        if (profileError) {
          throw profileError;
        }

        // Check if we have vehicle data to save
        const hasVehicleData = formData.vehicle_year.trim() || formData.vehicle_make.trim() || 
                               formData.vehicle_model.trim() || formData.vehicle_vin.trim();

        if (editingAccount.vehicle_id) {
          // Update existing vehicle
          const vehicleUpdate: Record<string, any> = {};

          const yearNum = Number.parseInt(formData.vehicle_year);
          if (Number.isFinite(yearNum) && yearNum > 0) vehicleUpdate.year = yearNum;
          if (formData.vehicle_make.trim()) vehicleUpdate.make = formData.vehicle_make.trim();
          if (formData.vehicle_model.trim()) vehicleUpdate.model = formData.vehicle_model.trim();
          if (formData.vehicle_vin.trim()) vehicleUpdate.vin = formData.vehicle_vin.trim();

          if (Object.keys(vehicleUpdate).length > 0) {
            const { error: vehicleError } = await supabase
              .from("vehicles")
              .update(vehicleUpdate)
              .eq("id", editingAccount.vehicle_id);

            if (vehicleError) {
              throw vehicleError;
            }
          }
        } else if (hasVehicleData) {
          // Create new vehicle and link to account
          const yearNum = Number.parseInt(formData.vehicle_year) || new Date().getFullYear();
          const { data: newVehicle, error: vehicleError } = await supabase
            .from("vehicles")
            .insert({
              year: yearNum,
              make: formData.vehicle_make.trim() || "Unknown",
              model: formData.vehicle_model.trim() || "Unknown",
              vin: formData.vehicle_vin.trim() || `TEMP-${Date.now()}`,
              price: formData.principal_amount,
              status: "sold",
            })
            .select()
            .single();

          if (vehicleError) {
            throw vehicleError;
          }

          // Link vehicle to account
          if (newVehicle) {
            const { error: linkError } = await supabase
              .from("customer_accounts")
              .update({ vehicle_id: newVehicle.id })
              .eq("id", editingAccount.id);

            if (linkError) {
              throw linkError;
            }
          }
        }

        const accountData = {
          principal_amount: formData.principal_amount,
          current_balance: formData.current_balance,
          // For flat fee, store the flat fee amount in interest_rate field
          interest_rate: formData.interest_rate_type === "flat_fee" ? formData.flat_fee_amount : formData.interest_rate,
          interest_rate_type: formData.interest_rate_type,
          payment_amount: formData.payment_amount,
          next_payment_date: formData.next_payment_date,
          late_fee_amount: formData.late_fee_amount,
          status: formData.status,
          payment_frequency: formData.payment_frequency,
        };

        const { data: updatedData, error: updateError } = await supabase
          .from("customer_accounts")
          .update(accountData)
          .eq("id", editingAccount.id)
          .select();

        if (updateError) {
          throw updateError;
        }

        if (!updatedData || updatedData.length === 0) {
          throw new Error("No rows were updated. You may not have permission to update this account.");
        }

        toast({
          title: "Success",
          description: "Account updated successfully",
        });
      }

      await fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingAccount ? "update" : "create"} account`,
        variant: "destructive",
      });
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    const { error } = await supabase
      .from("customer_accounts")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      fetchData();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleOpenEmailChange = (account: CustomerAccount) => {
    setEmailChangeAccount(account);
    setNewEmail(account.profile?.email || "");
    setEmailChangeDialogOpen(true);
  };

  const handleEmailChange = async () => {
    if (!emailChangeAccount || !newEmail) return;
    
    setChangingEmail(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            user_id: emailChangeAccount.user_id,
            new_email: newEmail,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update email");
      }

      toast({
        title: "Success",
        description: "Email updated successfully",
      });

      setEmailChangeDialogOpen(false);
      setEmailChangeAccount(null);
      setNewEmail("");
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    }
    setChangingEmail(false);
  };

  const isRamon = currentUserEmail === "ramon@carsandclaims.com";

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
              <h1 className="text-3xl font-bold">BHPH Account Management</h1>
              <p className="text-muted-foreground mt-1">
                Create and manage customer financing accounts
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Edit" : "Create"} BHPH Account</DialogTitle>
                <DialogDescription>
                  {editingAccount ? "Update account details and interest rates" : "Enter customer and vehicle information manually"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Information Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer_name">Full Name *</Label>
                      <Input
                        id="customer_name"
                        value={formData.customer_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_email">Email {!formData.customer_phone && "*"}</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer_phone">Phone {!formData.customer_email && "*"}</Label>
                      <Input
                        id="customer_phone"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_address">Address</Label>
                      <Input
                        id="customer_address"
                        value={formData.customer_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                        placeholder="123 Main St, City, State"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">* Phone or Email required (at least one)</p>
                </div>

                {/* Vehicle Information Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Vehicle Information</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_year">Year</Label>
                      <Input
                        id="vehicle_year"
                        value={formData.vehicle_year}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicle_year: e.target.value }))}
                        placeholder="2020"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_make">Make</Label>
                      <Input
                        id="vehicle_make"
                        value={formData.vehicle_make}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicle_make: e.target.value }))}
                        placeholder="Toyota"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_model">Model</Label>
                      <Input
                        id="vehicle_model"
                        value={formData.vehicle_model}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicle_model: e.target.value }))}
                        placeholder="Camry"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_vin">VIN (Optional)</Label>
                    <Input
                      id="vehicle_vin"
                      value={formData.vehicle_vin}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicle_vin: e.target.value }))}
                      placeholder="1HGBH41JXMN109186"
                    />
                  </div>
                </div>

                {/* Financing Details Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Financing Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="principal">Principal Amount ($) *</Label>
                      <Input
                        id="principal"
                        type="number"
                        step="0.01"
                        value={formData.principal_amount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({ 
                            ...prev, 
                            principal_amount: value,
                            current_balance: editingAccount ? prev.current_balance : value
                          }));
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="down_payment">Down Payment ($)</Label>
                      <Input
                        id="down_payment"
                        type="number"
                        step="0.01"
                        value={formData.down_payment}
                        onChange={(e) => setFormData(prev => ({ ...prev, down_payment: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="balance">Current Balance ($) *</Label>
                      <Input
                        id="balance"
                        type="number"
                        step="0.01"
                        value={formData.current_balance}
                        onChange={(e) => setFormData(prev => ({ ...prev, current_balance: parseFloat(e.target.value) || 0 }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="interest_type">Interest Type *</Label>
                      <Select
                        value={formData.interest_rate_type}
                        onValueChange={(value: "percentage" | "flat_fee") => {
                          setFormData(prev => ({ 
                            ...prev, 
                            interest_rate_type: value,
                            interest_rate: value === "flat_fee" ? 0 : prev.interest_rate
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">APR (% per year)</SelectItem>
                          <SelectItem value="flat_fee">Flat Fee ($/mo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flat_fee">Flat Fee ($/mo)</Label>
                      <Input
                        id="flat_fee"
                        type="number"
                        step="0.01"
                        value={formData.flat_fee_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, flat_fee_amount: parseFloat(e.target.value) || 0 }))}
                        disabled={formData.interest_rate_type !== "flat_fee"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interest">APR (%) *</Label>
                      <Input
                        id="interest"
                        type="number"
                        step="0.01"
                        value={formData.interest_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) || 0 }))}
                        required
                        disabled={formData.interest_rate_type === "flat_fee"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment">Monthly Payment ($) *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="payment"
                          type="number"
                          step="0.01"
                          value={formData.payment_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))}
                          required
                        />
                        <Button type="button" variant="outline" size="sm" onClick={calculateMonthlyPayment}>
                          Calc
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lateFee">Late Fee ($/day)</Label>
                      <Input
                        id="lateFee"
                        type="number"
                        step="0.01"
                        value={formData.late_fee_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, late_fee_amount: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nextPayment">Next Payment Date *</Label>
                      <Input
                        id="nextPayment"
                        type="date"
                        value={formData.next_payment_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, next_payment_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Payment Frequency</Label>
                      <Select
                        value={formData.payment_frequency}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, payment_frequency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="repossessed">Repossessed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingAccount ? "Update" : "Create"} Account
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabbed Account View */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Complete</TabsTrigger>
            <TabsTrigger value="repossessed">Repossessed</TabsTrigger>
          </TabsList>

          {["active", "completed", "repossessed"].map((tabStatus) => {
            const isTestAccount = (name: string | null | undefined) => 
              name?.toLowerCase().includes("jonathan") && name?.toLowerCase().includes("low");
            
            const tabAccounts = accounts.filter((a) => {
              const status = a.status || "active";
              if (tabStatus === "active") return status === "active" || status === "delinquent" || status === "paid_off";
              return status === tabStatus;
            });
            const nonTestAccounts = tabAccounts.filter((a) => !isTestAccount(a.profile?.full_name));
            const totalCustomers = nonTestAccounts.length;
            const totalBalance = nonTestAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);

            const handleStatusChange = async (accountId: string, newStatus: string) => {
              try {
                const { error } = await supabase
                  .from("customer_accounts")
                  .update({ status: newStatus })
                  .eq("id", accountId);
                if (error) throw error;
                toast({ title: "Success", description: `Account moved to ${newStatus}` });
                await fetchData();
              } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
              }
            };

            return (
              <TabsContent key={tabStatus} value={tabStatus} className="space-y-4">
                {/* Summary Statistics */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalCustomers}</div>
                      <p className="text-xs text-muted-foreground capitalize">{tabStatus} BHPH accounts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Outstanding Balance</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
                      <p className="text-xs text-muted-foreground capitalize">Combined {tabStatus} balance</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize">{tabStatus} Accounts</CardTitle>
                    <CardDescription>
                      {tabStatus === "active" ? "Currently active financing accounts" : 
                       tabStatus === "completed" ? "Fully paid off accounts" : "Repossessed vehicle accounts"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tabAccounts.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No {tabStatus} accounts found</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Customer</TableHead>
                              <TableHead>Vehicle</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead>Rate / Flat Fee</TableHead>
                              <TableHead>Payment</TableHead>
                              <TableHead>Next Due</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tabAccounts.map((account) => {
                              const isTest = account.profile?.full_name?.toLowerCase().includes("jonathan") && 
                                             account.profile?.full_name?.toLowerCase().includes("low");
                              return (
                              <TableRow key={account.id} className={isTest ? "bg-muted/50" : ""}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {account.profile?.full_name || "N/A"}
                                      {isTest && <Badge variant="outline" className="text-xs">Test Account</Badge>}
                                    </div>
                                    <div className="text-sm text-muted-foreground">{account.profile?.email}</div>
                                    {account.profile?.phone && (
                                      <div className="text-sm text-muted-foreground">{account.profile.phone}</div>
                                    )}
                                </div>
                                </TableCell>
                                <TableCell>
                                  {account.vehicle 
                                    ? `${account.vehicle.year} ${account.vehicle.make} ${account.vehicle.model}`
                                    : "N/A"
                                  }
                                </TableCell>
                                <TableCell>{formatCurrency(account.current_balance)}</TableCell>
                                <TableCell>
                                  {(() => {
                                    const storedRate = Number(account.interest_rate) || 0;
                                    const type = account.interest_rate_type;
                                    const isFlatFee =
                                      type === "flat_fee"
                                        ? true
                                        : type === "percentage"
                                          ? false
                                          : (() => {
                                              const principal = account.principal_amount;
                                              const months = 36;
                                              const expectedFlatFeePayment = principal / months + storedRate;
                                              return storedRate >= 10 && Math.abs(account.payment_amount - expectedFlatFeePayment) < 1;
                                            })();
                                    return isFlatFee ? `${formatCurrency(storedRate)}/mo` : `${storedRate}%`;
                                  })()}
                                </TableCell>
                                <TableCell>{formatCurrency(account.payment_amount)}</TableCell>
                                <TableCell>{new Date(account.next_payment_date + 'T00:00:00').toLocaleDateString()}</TableCell>
                                <TableCell>
                                  {tabStatus === "active" ? (
                                    <Select
                                      value={account.status || "active"}
                                      onValueChange={(value) => handleStatusChange(account.id, value)}
                                    >
                                      <SelectTrigger className="w-[130px] h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="repossessed">Repossessed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge variant="secondary" className="capitalize">
                                      {account.status}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleViewAccount(account)} title="View Account">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {isRamon && (
                                      <Button variant="ghost" size="sm" onClick={() => handleOpenEmailChange(account)} title="Change Email">
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
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
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Email Change Dialog - Only for Ramon */}
        <Dialog open={emailChangeDialogOpen} onOpenChange={setEmailChangeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Account Email</DialogTitle>
              <DialogDescription>
                Update the login email for {emailChangeAccount?.profile?.full_name || "this customer"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Email</Label>
                <Input value={emailChangeAccount?.profile?.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">New Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="newemail@example.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailChangeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEmailChange} disabled={changingEmail || !newEmail}>
                {changingEmail && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Update Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Account Detail View Dialog */}
        {selectedAccount && (
          <AccountDetailView
            account={selectedAccount}
            open={detailViewOpen}
            onOpenChange={setDetailViewOpen}
            onPaymentRecorded={fetchData}
          />
        )}
      </div>
    </div>
  );
};

export default AdminAccounts;