import { useEffect, useState, useRef } from "react";
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
import { Loader2, ArrowLeft, Mail, MessageSquare, Send, Users, CheckCircle2, Sparkles, Paperclip, X, FileIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Attachment {
  file: File;
  name: string;
  size: number;
  type: string;
}
const occasionOptions = [
  { label: "🌸 Spring", value: "spring", group: "Seasons" },
  { label: "☀️ Summer", value: "summer", group: "Seasons" },
  { label: "🍂 Fall", value: "fall", group: "Seasons" },
  { label: "❄️ Winter", value: "winter", group: "Seasons" },
  { label: "🎉 New Year", value: "new-year", group: "Holidays" },
  { label: "💕 Valentine's Day", value: "valentines", group: "Holidays" },
  { label: "🐣 Easter", value: "easter", group: "Holidays" },
  { label: "🇺🇸 Memorial Day", value: "memorial-day", group: "Holidays" },
  { label: "🎆 Independence Day", value: "independence-day", group: "Holidays" },
  { label: "💼 Labor Day", value: "labor-day", group: "Holidays" },
  { label: "🎃 Halloween", value: "halloween", group: "Holidays" },
  { label: "🦃 Thanksgiving", value: "thanksgiving", group: "Holidays" },
  { label: "🎄 Christmas", value: "christmas", group: "Holidays" },
  { label: "💰 Tax Season", value: "tax-season", group: "Events" },
  { label: "📚 Back to School", value: "back-to-school", group: "Events" },
  { label: "🛒 Black Friday", value: "black-friday", group: "Events" },
  { label: "📅 Payment Reminder", value: "payment-reminder", group: "Events" },
  { label: "🔧 Service Reminder", value: "service-reminder", group: "Events" },
  { label: "👥 Referral Program", value: "referral-program", group: "Events" },
];

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
  const [generatingContent, setGeneratingContent] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleGenerateContent = async (occasion: string) => {
    if (!occasion) return;
    
    setGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-email-content", {
        body: { occasion, type: activeTab as "email" | "sms" },
      });

      if (error) throw error;

      if (activeTab === "email") {
        if (data.subject) setEmailSubject(data.subject);
        if (data.content) setEmailBody(data.content);
      } else {
        if (data.content) setSmsMessage(data.content);
      }

      toast({ title: "Content generated!", description: "AI has filled in your message." });
    } catch (error: any) {
      console.error("Error generating content:", error);
      toast({
        title: "Failed to generate content",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB per file
    const maxFiles = 5;

    if (attachments.length + files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} attachments allowed`,
        variant: "destructive",
      });
      return;
    }

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        continue;
      }
      newAttachments.push({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime/type;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
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

    // Convert attachments to base64
    const attachmentData = await Promise.all(
      attachments.map(async (att) => ({
        filename: att.name,
        content: await fileToBase64(att.file),
        content_type: att.type,
      }))
    );

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
            attachments: attachmentData,
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
    if (successCount > 0) {
      setAttachments([]); // Clear attachments after successful send
    }
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
                  <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                    <Label className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Content Generator
                    </Label>
                    <Select onValueChange={handleGenerateContent} disabled={generatingContent}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={generatingContent ? "Generating..." : "Select occasion to auto-generate content..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Seasons</div>
                        {occasionOptions.filter(o => o.group === "Seasons").map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Holidays</div>
                        {occasionOptions.filter(o => o.group === "Holidays").map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Events</div>
                        {occasionOptions.filter(o => o.group === "Events").map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {generatingContent && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        AI is writing your message...
                      </div>
                    )}
                  </div>
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

                  {/* Attachments Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Attachments
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {attachments.length}/5 files (max 10MB each)
                      </span>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                    />
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={attachments.length >= 5}
                      className="w-full border-dashed"
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Add Attachments
                    </Button>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((att, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{att.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(att.size)}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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
                  <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                    <Label className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Content Generator
                    </Label>
                    <Select onValueChange={handleGenerateContent} disabled={generatingContent}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={generatingContent ? "Generating..." : "Select occasion to auto-generate content..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Seasons</div>
                        {occasionOptions.filter(o => o.group === "Seasons").map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Holidays</div>
                        {occasionOptions.filter(o => o.group === "Holidays").map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Events</div>
                        {occasionOptions.filter(o => o.group === "Events").map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {generatingContent && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        AI is writing your message...
                      </div>
                    )}
                  </div>
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
