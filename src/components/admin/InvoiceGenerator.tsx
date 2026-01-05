import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Send, Plus, Trash2, Loader2, User, Wand2, Save, FolderOpen } from "lucide-react";

interface LineItem {
  id: string;
  type: "parts" | "labor";
  description: string;
  customDescription: string;
  quantity: number;
  unitPrice: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  vehicleInfo: string | null;
}

const PARTS_OPTIONS = [
  "Oil Filter",
  "Air Filter",
  "Brake Pads",
  "Brake Rotors",
  "Spark Plugs",
  "Battery",
  "Alternator",
  "Starter Motor",
  "Timing Belt",
  "Water Pump",
  "Radiator",
  "Thermostat",
  "Fuel Pump",
  "Ignition Coil",
  "CV Axle",
  "Wheel Bearing",
  "Tie Rod End",
  "Ball Joint",
  "Control Arm",
  "Struts/Shocks",
  "Muffler",
  "Catalytic Converter",
  "O2 Sensor",
  "MAF Sensor",
  "Transmission Fluid",
  "Coolant",
  "Power Steering Fluid",
  "Windshield Wipers",
  "Headlight Bulb",
  "Custom Entry",
];

const LABOR_OPTIONS = [
  "Oil Change",
  "Brake Service",
  "Tire Rotation",
  "Wheel Alignment",
  "Tune-Up",
  "Engine Diagnostic",
  "Transmission Service",
  "Cooling System Flush",
  "A/C Service",
  "Electrical Repair",
  "Suspension Work",
  "Exhaust Repair",
  "Engine Repair",
  "Timing Belt Replacement",
  "Clutch Replacement",
  "Alternator Replacement",
  "Starter Replacement",
  "Fuel System Service",
  "Inspection",
  "Pre-Purchase Inspection",
  "Custom Entry",
];

export const InvoiceGenerator = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [checkingGrammar, setCheckingGrammar] = useState<string | null>(null);
  const [checkingNotesGrammar, setCheckingNotesGrammar] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchDrafts();
  }, []);

  const fetchCustomers = async () => {
    try {
      // Fetch customer accounts with profile and vehicle info
      const { data: accounts, error } = await supabase
        .from("customer_accounts")
        .select(`
          id,
          user_id,
          vehicle_id,
          vehicles (year, make, model)
        `)
        .eq("status", "active");

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(accounts?.map(a => a.user_id) || [])];

      // Fetch profiles for those users
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      if (profileError) throw profileError;

      // Combine data
      const customerList: Customer[] = [];
      const seenUserIds = new Set<string>();

      accounts?.forEach(account => {
        if (seenUserIds.has(account.user_id)) return;
        seenUserIds.add(account.user_id);

        const profile = profiles?.find(p => p.id === account.user_id);
        if (profile) {
          const vehicle = account.vehicles as { year: number; make: string; model: string } | null;
          customerList.push({
            id: account.user_id,
            name: profile.full_name || profile.email,
            email: profile.email,
            phone: profile.phone,
            vehicleInfo: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null,
          });
        }
      });

      // Sort by name
      customerList.sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(customerList);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const { data, error } = await (supabase
        .from("invoices" as any) as any)
        .select("*")
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!customerName.trim() && lineItems.length === 0) {
      toast({
        title: "Nothing to Save",
        description: "Please add some information before saving.",
        variant: "destructive",
      });
      return;
    }

    setSavingDraft(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let customerAccountId = null;
      if (selectedCustomerId && selectedCustomerId !== "manual") {
        const { data: accountData } = await supabase
          .from("customer_accounts")
          .select("id")
          .eq("user_id", selectedCustomerId)
          .eq("status", "active")
          .limit(1)
          .single();
        
        if (accountData) {
          customerAccountId = accountData.id;
        }
      }

      const invoiceData = {
        customer_id: customerAccountId,
        customer_name: customerName || "Draft",
        customer_email: customerEmail || "draft@placeholder.com",
        customer_phone: customers.find(c => c.id === selectedCustomerId)?.phone || null,
        vehicle_info: vehicleInfo || null,
        line_items: lineItems,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateTotal(),
        notes: notes || null,
        status: "draft",
        created_by: user?.id || null,
      };

      if (currentDraftId) {
        // Update existing draft
        const { error } = await (supabase
          .from("invoices" as any) as any)
          .update(invoiceData)
          .eq("id", currentDraftId);

        if (error) throw error;
        toast({
          title: "Draft Updated",
          description: "Your invoice draft has been saved.",
        });
      } else {
        // Create new draft
        const { data, error } = await (supabase
          .from("invoices" as any) as any)
          .insert(invoiceData)
          .select()
          .single();

        if (error) throw error;
        setCurrentDraftId(data.id);
        toast({
          title: "Draft Saved",
          description: "Your invoice draft has been saved.",
        });
      }

      fetchDrafts();
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleLoadDraft = (draft: any) => {
    setCurrentDraftId(draft.id);
    setCustomerName(draft.customer_name === "Draft" ? "" : draft.customer_name);
    setCustomerEmail(draft.customer_email === "draft@placeholder.com" ? "" : draft.customer_email);
    setVehicleInfo(draft.vehicle_info || "");
    setNotes(draft.notes || "");
    setLineItems(draft.line_items || []);
    setSelectedCustomerId("");
    
    toast({
      title: "Draft Loaded",
      description: "Invoice draft has been loaded for editing.",
    });
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const { error } = await (supabase
        .from("invoices" as any) as any)
        .delete()
        .eq("id", draftId);

      if (error) throw error;
      
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
      }
      
      fetchDrafts();
      toast({
        title: "Draft Deleted",
        description: "The draft has been removed.",
      });
    } catch (error: any) {
      console.error("Error deleting draft:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete draft",
        variant: "destructive",
      });
    }
  };

  const handleClearForm = () => {
    setCurrentDraftId(null);
    setSelectedCustomerId("");
    setCustomerName("");
    setCustomerEmail("");
    setVehicleInfo("");
    setLineItems([]);
    setNotes("");
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    
    if (customerId === "manual") {
      // Clear fields for manual entry
      setCustomerName("");
      setCustomerEmail("");
      setVehicleInfo("");
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerEmail(customer.email);
      setVehicleInfo(customer.vehicleInfo || "");
    }
  };

  const addLineItem = (type: "parts" | "labor") => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        type,
        description: "",
        customDescription: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleGrammarCheck = async (itemId: string) => {
    const item = lineItems.find(i => i.id === itemId);
    if (!item || !item.customDescription.trim()) return;

    setCheckingGrammar(itemId);
    try {
      const { data, error } = await supabase.functions.invoke("grammar-check", {
        body: { text: item.customDescription },
      });

      if (error) throw error;

      if (data?.correctedText) {
        updateLineItem(itemId, "customDescription", data.correctedText);
        toast({
          title: "Text Corrected",
          description: "Spelling and grammar have been checked.",
        });
      }
    } catch (error: any) {
      console.error("Grammar check error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check grammar",
        variant: "destructive",
      });
    } finally {
      setCheckingGrammar(null);
    }
  };

  const handleNotesGrammarCheck = async () => {
    if (!notes.trim()) return;

    setCheckingNotesGrammar(true);
    try {
      const { data, error } = await supabase.functions.invoke("grammar-check", {
        body: { text: notes },
      });

      if (error) throw error;

      if (data?.correctedText) {
        setNotes(data.correctedText);
        toast({
          title: "Text Corrected",
          description: "Spelling and grammar have been checked.",
        });
      }
    } catch (error: any) {
      console.error("Grammar check error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check grammar",
        variant: "destructive",
      });
    } finally {
      setCheckingNotesGrammar(false);
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.07; // 7% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const getItemDescription = (item: LineItem) => {
    return item.description === "Custom Entry" ? item.customDescription : item.description;
  };

  const generateInvoiceHTML = () => {
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    const invoiceDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const partsItems = lineItems.filter((item) => item.type === "parts");
    const laborItems = lineItems.filter((item) => item.type === "labor");

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
        <div style="text-align: center; border-bottom: 3px solid #22c55e; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 28px;">Quality Foreign Domestic Autos</h1>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Professional Auto Sales & Service</p>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 12px;">470-519-6717 | ramon@carsandclaims.com</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <h3 style="color: #22c55e; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase;">Bill To:</h3>
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${customerName}</p>
            <p style="margin: 5px 0 0 0; color: #666;">${customerEmail}</p>
            ${vehicleInfo ? `<p style="margin: 5px 0 0 0; color: #666;"><strong>Vehicle:</strong> ${vehicleInfo}</p>` : ""}
          </div>
          <div style="text-align: right;">
            <h3 style="color: #22c55e; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase;">Invoice Details:</h3>
            <p style="margin: 0;"><strong>Invoice #:</strong> ${invoiceNumber}</p>
            <p style="margin: 5px 0 0 0;"><strong>Date:</strong> ${invoiceDate}</p>
          </div>
        </div>

        ${partsItems.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h3 style="background: #f3f4f6; padding: 10px; margin: 0; font-size: 14px; text-transform: uppercase; border-left: 4px solid #22c55e;">Parts</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="text-align: left; padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">Description</th>
                  <th style="text-align: center; padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">Qty</th>
                  <th style="text-align: right; padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">Unit Price</th>
                  <th style="text-align: right; padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${partsItems.map((item) => `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${getItemDescription(item)}</td>
                    <td style="text-align: center; padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
                    <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e5e7eb;">$${item.unitPrice.toFixed(2)}</td>
                    <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e5e7eb;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : ""}

        ${laborItems.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h3 style="background: #f3f4f6; padding: 10px; margin: 0; font-size: 14px; text-transform: uppercase; border-left: 4px solid #3b82f6;">Labor</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="text-align: left; padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">Description</th>
                  <th style="text-align: center; padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">Hours</th>
                  <th style="text-align: right; padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">Rate</th>
                  <th style="text-align: right; padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${laborItems.map((item) => `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${getItemDescription(item)}</td>
                    <td style="text-align: center; padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
                    <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e5e7eb;">$${item.unitPrice.toFixed(2)}</td>
                    <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e5e7eb;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : ""}

        <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
          <table style="width: 100%; max-width: 300px; margin-left: auto;">
            <tr>
              <td style="padding: 5px 0; font-size: 14px;">Subtotal:</td>
              <td style="text-align: right; padding: 5px 0; font-size: 14px;">$${calculateSubtotal().toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 14px;">Tax (7%):</td>
              <td style="text-align: right; padding: 5px 0; font-size: 14px;">$${calculateTax().toFixed(2)}</td>
            </tr>
            <tr style="font-weight: bold; font-size: 18px;">
              <td style="padding: 10px 0; border-top: 2px solid #22c55e;">Total Due:</td>
              <td style="text-align: right; padding: 10px 0; border-top: 2px solid #22c55e; color: #22c55e;">$${calculateTotal().toFixed(2)}</td>
            </tr>
          </table>
        </div>

        ${notes ? `
          <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #374151;">Notes:</h4>
            <p style="margin: 0; color: #666; font-size: 14px; white-space: pre-wrap;">${notes}</p>
          </div>
        ` : ""}

        <div style="margin-top: 40px; padding: 25px; background: linear-gradient(135deg, #22c55e15 0%, #3b82f615 100%); border-radius: 12px; text-align: center;">
          <h3 style="color: #22c55e; margin: 0 0 10px 0; font-size: 18px;">Thank You for Your Business!</h3>
          <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
            We truly appreciate your trust in Quality Foreign Domestic Autos. Your satisfaction is our top priority, 
            and we're committed to keeping your vehicle running smoothly. If you have any questions about this invoice 
            or need further assistance, please don't hesitate to reach out.
          </p>
          <p style="margin: 15px 0 0 0; color: #374151; font-weight: 500;">
            We look forward to serving you again!
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">Quality Foreign Domestic Autos</p>
          <p style="margin: 5px 0 0 0;">470-519-6717 | ramon@carsandclaims.com</p>
        </div>
      </div>
    `;
  };

  const handleSendInvoice = async () => {
    if (!customerName.trim() || !customerEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter customer name and email.",
        variant: "destructive",
      });
      return;
    }

    if (lineItems.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one parts or labor item.",
        variant: "destructive",
      });
      return;
    }

    const invalidItems = lineItems.filter((item) => 
      !item.description || (item.description === "Custom Entry" && !item.customDescription.trim())
    );
    if (invalidItems.length > 0) {
      toast({
        title: "Incomplete Items",
        description: "Please select a description for all line items (or enter custom description).",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const invoiceHTML = generateInvoiceHTML();
      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const total = calculateTotal();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Find customer account ID if a customer was selected
      let customerAccountId = null;
      if (selectedCustomerId && selectedCustomerId !== "manual") {
        const { data: accountData } = await supabase
          .from("customer_accounts")
          .select("id")
          .eq("user_id", selectedCustomerId)
          .eq("status", "active")
          .limit(1)
          .single();
        
        if (accountData) {
          customerAccountId = accountData.id;
        }
      }

      // Save invoice to database (table newly created, types will sync)
      const invoiceData = {
        customer_id: customerAccountId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customers.find(c => c.id === selectedCustomerId)?.phone || null,
        vehicle_info: vehicleInfo || null,
        line_items: lineItems,
        subtotal: subtotal,
        tax: tax,
        total: total,
        notes: notes || null,
        status: "sent",
        created_by: user?.id || null,
      };
      
      const { error: saveError } = await (supabase
        .from("invoices" as any) as any)
        .insert(invoiceData);

      if (saveError) {
        console.error("Error saving invoice:", saveError);
        // Continue to send email even if save fails
      }

      // Send invoice email
      const { error } = await supabase.functions.invoke("send-custom-email", {
        body: {
          to: customerEmail,
          subject: `Invoice from Quality Foreign Domestic Autos - $${total.toFixed(2)}`,
          customerName: customerName,
          bodyHtml: invoiceHTML,
        },
      });

      if (error) throw error;

      toast({
        title: "Invoice Sent!",
        description: `Invoice sent successfully to ${customerEmail}`,
      });

      // Delete draft if it was sent from a draft
      if (currentDraftId) {
        await (supabase
          .from("invoices" as any) as any)
          .delete()
          .eq("id", currentDraftId);
        fetchDrafts();
      }

      // Reset form
      handleClearForm();
    } catch (error: any) {
      console.error("Error sending invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoice Generator
          {currentDraftId && (
            <span className="text-sm font-normal text-muted-foreground">(Editing Draft)</span>
          )}
        </CardTitle>
        <CardDescription>
          Generate and send professional invoices for parts and labor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drafts Section */}
        {drafts.length > 0 && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <Label className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Saved Drafts ({drafts.length})
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`flex items-center justify-between p-2 rounded border ${
                    currentDraftId === draft.id ? "bg-primary/10 border-primary" : "bg-background"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {draft.customer_name === "Draft" ? "Untitled Draft" : draft.customer_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${draft.total?.toFixed(2) || "0.00"} • {new Date(draft.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoadDraft(draft)}
                      disabled={currentDraftId === draft.id}
                    >
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="text-destructive hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Customer Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Select Customer
          </Label>
          <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select a customer or enter manually..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">✏️ Enter Manually</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name} — {customer.email}
                  {customer.vehicleInfo && ` (${customer.vehicleInfo})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Customer Information */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="John Doe"
              disabled={selectedCustomerId !== "manual" && selectedCustomerId !== ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Customer Email *</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="john@example.com"
              disabled={selectedCustomerId !== "manual" && selectedCustomerId !== ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleInfo">Vehicle (Optional)</Label>
            <Input
              id="vehicleInfo"
              value={vehicleInfo}
              onChange={(e) => setVehicleInfo(e.target.value)}
              placeholder="2020 Toyota Camry"
            />
          </div>
        </div>

        {/* Add Line Items Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => addLineItem("parts")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Parts
          </Button>
          <Button variant="outline" onClick={() => addLineItem("labor")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Labor
          </Button>
        </div>

        {/* Line Items */}
        {lineItems.length > 0 && (
          <div className="space-y-3">
            {lineItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  item.type === "parts" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"
                }`}
              >
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    item.type === "parts"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {item.type === "parts" ? "PARTS" : "LABOR"}
                </span>
                <Select
                  value={item.description}
                  onValueChange={(value) => {
                    updateLineItem(item.id, "description", value);
                    if (value !== "Custom Entry") {
                      updateLineItem(item.id, "customDescription", "");
                    }
                  }}
                >
                  <SelectTrigger className="w-40 bg-background">
                    <SelectValue placeholder={`Select ${item.type}...`} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {(item.type === "parts" ? PARTS_OPTIONS : LABOR_OPTIONS).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {item.description === "Custom Entry" && (
                  <div className="flex flex-1 gap-1">
                    <Input
                      value={item.customDescription}
                      onChange={(e) => updateLineItem(item.id, "customDescription", e.target.value)}
                      className="flex-1 bg-background"
                      placeholder="Enter custom description..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleGrammarCheck(item.id)}
                      disabled={checkingGrammar === item.id || !item.customDescription.trim()}
                      title="Check spelling & grammar"
                      className="shrink-0"
                    >
                      {checkingGrammar === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                  className="w-20 bg-background"
                  placeholder="Qty"
                />
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice || ""}
                    onChange={(e) => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-24 bg-background"
                    placeholder="Price"
                  />
                </div>
                <span className="w-24 text-right font-medium">
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax (7%):</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="notes">Notes (Optional)</Label>
            {notes.trim() && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNotesGrammarCheck}
                disabled={checkingNotesGrammar}
                title="Check spelling & grammar"
              >
                {checkingNotesGrammar ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-1" />
                )}
                Check Grammar
              </Button>
            )}
          </div>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes or special instructions..."
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={savingDraft || (!customerName.trim() && lineItems.length === 0)}
            className="flex-1"
          >
            {savingDraft ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {currentDraftId ? "Update Draft" : "Save as Draft"}
              </>
            )}
          </Button>
          {(currentDraftId || customerName || lineItems.length > 0) && (
            <Button
              variant="ghost"
              onClick={handleClearForm}
            >
              Clear
            </Button>
          )}
        </div>

        <Button
          onClick={handleSendInvoice}
          disabled={sending || lineItems.length === 0}
          className="w-full"
          size="lg"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Invoice...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Invoice to Customer
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
