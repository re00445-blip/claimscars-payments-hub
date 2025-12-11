import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Smartphone, Building2, DollarSign, ExternalLink, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  is_enabled: boolean;
  instructions: string | null;
}

interface PaymentMethodsSectionProps {
  accountId: string;
  currentBalance: number;
  paymentAmount: number;
  onPaymentSuccess?: () => void;
}

export const PaymentMethodsSection = ({
  accountId,
  currentBalance,
  paymentAmount,
  onPaymentSuccess,
}: PaymentMethodsSectionProps) => {
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingStripe, setProcessingStripe] = useState(false);
  const [customAmount, setCustomAmount] = useState(paymentAmount.toString());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("is_enabled", true);

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error("Error fetching payment settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSetting = (key: string) => {
    return settings.find((s) => s.setting_key === key);
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStripePayment = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    if (amount < 0.50) {
      toast.error("Minimum payment amount is $0.50");
      return;
    }

    setProcessingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to make a payment");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-bhph-payment", {
        body: {
          amount,
          accountId,
          accountBalance: currentBalance,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Redirecting to payment page...");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to initiate payment");
    } finally {
      setProcessingStripe(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const stripeEnabled = getSetting("stripe_enabled")?.is_enabled;
  const cashAppTag = getSetting("cashapp_cashtag");
  const zelleContact = getSetting("zelle_contact");
  const businessName = getSetting("business_name")?.setting_value || "Cars & Claims";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Make a Payment
        </CardTitle>
        <CardDescription>
          Choose your preferred payment method
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="payment-amount">Payment Amount</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.50"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="pl-9"
                placeholder="Enter amount (min $0.50)"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomAmount(paymentAmount.toString())}
            >
              Monthly ({formatCurrency(paymentAmount)})
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Current balance: {formatCurrency(currentBalance)}
          </p>
        </div>

        <Separator />

        {/* Stripe/Card Payment */}
        {stripeEnabled && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="font-medium">Credit/Debit Card</span>
              <Badge variant="secondary" className="ml-auto">Recommended</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {getSetting("stripe_enabled")?.instructions || "Pay securely with your credit or debit card"}
            </p>
            <Button 
              onClick={handleStripePayment} 
              disabled={processingStripe}
              className="w-full"
            >
              {processingStripe ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay {formatCurrency(parseFloat(customAmount) || 0)} with Card
                </>
              )}
            </Button>
          </div>
        )}

        {stripeEnabled && (cashAppTag?.is_enabled || zelleContact?.is_enabled) && (
          <Separator />
        )}

        {/* Cash App */}
        {cashAppTag?.is_enabled && cashAppTag.setting_value && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-[#00D632]" />
              <span className="font-medium">Cash App</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {cashAppTag.instructions || "Send payment to our Cash App"}
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="font-mono font-semibold text-lg flex-1">
                {cashAppTag.setting_value}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(cashAppTag.setting_value!, "cashapp")}
              >
                {copiedField === "cashapp" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://cash.app/${cashAppTag.setting_value?.replace("$", "")}`, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Include your name in the payment note for faster processing
            </p>
          </div>
        )}

        {cashAppTag?.is_enabled && zelleContact?.is_enabled && <Separator />}

        {/* Zelle */}
        {zelleContact?.is_enabled && zelleContact.setting_value && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#6D1ED4]" />
              <span className="font-medium">Zelle</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {zelleContact.instructions || "Send payment via Zelle"}
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="font-semibold">{businessName}</p>
                <p className="font-mono text-lg">{zelleContact.setting_value}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(zelleContact.setting_value!, "zelle")}
              >
                {copiedField === "zelle" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Send to {zelleContact.setting_value} and include your name in the memo
            </p>
          </div>
        )}

        <Separator />

        {/* Contact Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Questions about payments? Call us at</p>
          <a href="tel:470-519-6717" className="font-semibold text-primary hover:underline">
            470-519-6717
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
