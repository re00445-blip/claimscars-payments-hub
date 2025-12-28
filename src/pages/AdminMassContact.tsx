import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, MessageSquare, Send, Users, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CustomerWithProfile {
  id: string;
  user_id: string;
  profile: {
    full_name: string | null;
    email: string;
    phone: string | null;
  } | null;
}

const AdminMassContact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [customers, setCustomers] = useState<CustomerWithProfile[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [activeTab, setActiveTab] = useState("email");

  useEffect(() => {
    checkAdminAndFetchCustomers();
  }, []);

  const checkAdminAndFetchCustomers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      navigate("/dashboard");
      return;
    }

    // Fetch all customer accounts with their profiles
    const { data: accounts, error } = await supabase
      .from("customer_accounts")
      .select("id, user_id")
      .eq("status", "active");

    if (error) {
      console.error("Error fetching accounts:", error);
      setLoading(false);
      return;
    }

    // Fetch profiles for each user
    const customersWithProfiles: CustomerWithProfile[] = [];
    for (const account of accounts || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", account.user_id)
        .maybeSingle();

      customersWithProfiles.push({
        id: account.id,
        user_id: account.user_id,
        profile: profile,
      });
    }

    setCustomers(customersWithProfiles);
    setLoading(false);
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.id)));
    }
  };

  const toggleCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleSendEmail = async () => {
    if (selectedCustomers.size === 0) {
      toast({ title: "No customers selected", variant: "destructive" });
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast({ title: "Please enter subject and message", variant: "destructive" });
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const customerId of selectedCustomers) {
      const customer = customers.find(c => c.id === customerId);
      if (!customer?.profile?.email) {
        failCount++;
        continue;
      }

      try {
        const response = await supabase.functions.invoke("send-mass-contact", {
          body: {
            type: "email",
            to: customer.profile.email,
            subject: emailSubject,
            message: emailBody,
            customerName: customer.profile.full_name || "Customer",
          },
        });

        if (response.error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    setSending(false);
    toast({
      title: "Emails sent",
      description: `Successfully sent: ${successCount}, Failed: ${failCount}`,
    });
  };

  const handleSendSms = async () => {
    if (selectedCustomers.size === 0) {
      toast({ title: "No customers selected", variant: "destructive" });
      return;
    }
    if (!smsMessage.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const customerId of selectedCustomers) {
      const customer = customers.find(c => c.id === customerId);
      if (!customer?.profile?.phone) {
        failCount++;
        continue;
      }

      try {
        const response = await supabase.functions.invoke("send-mass-contact", {
          body: {
            type: "sms",
            to: customer.profile.phone,
            message: smsMessage,
            customerName: customer.profile.full_name || "Customer",
          },
        });

        if (response.error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    setSending(false);
    toast({
      title: "Text messages sent",
      description: `Successfully sent: ${successCount}, Failed: ${failCount}`,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
            <Send className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Contact the People</h1>
            <p className="text-muted-foreground">Send mass emails and text messages to customers</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Customers
              </CardTitle>
              <CardDescription>
                Choose which customers to contact ({selectedCustomers.size} of {customers.length} selected)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedCustomers.size === customers.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {customers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No active customer accounts found</p>
                ) : (
                  customers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedCustomers.has(customer.id)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleCustomer(customer.id)}
                    >
                      <Checkbox
                        checked={selectedCustomers.has(customer.id)}
                        onCheckedChange={() => toggleCustomer(customer.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {customer.profile?.full_name || "Unknown"}
                        </p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.profile?.email || "No email"}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {customer.profile?.phone || "No phone"}
                          </span>
                        </div>
                      </div>
                      {selectedCustomers.has(customer.id) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Composition */}
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
              <CardDescription>Write your email or text message</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Text Message
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter email subject..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email-body">Message</Label>
                    <Textarea
                      id="email-body"
                      placeholder="Enter your email message..."
                      className="min-h-[200px]"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSendEmail}
                    disabled={sending || selectedCustomers.size === 0}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Email to {selectedCustomers.size} Customer{selectedCustomers.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="sms" className="space-y-4">
                  <div>
                    <Label htmlFor="sms-body">Message</Label>
                    <Textarea
                      id="sms-body"
                      placeholder="Enter your text message..."
                      className="min-h-[200px]"
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      maxLength={160}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {smsMessage.length}/160 characters
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSendSms}
                    disabled={sending || selectedCustomers.size === 0}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Text to {selectedCustomers.size} Customer{selectedCustomers.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminMassContact;
