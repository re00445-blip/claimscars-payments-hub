import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, DollarSign, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
}

interface PurchaseIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
}

const applicationSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Please enter your full address").max(500),
});

export function PurchaseIntakeDialog({ open, onOpenChange, vehicle }: PurchaseIntakeDialogProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  
  // Calculator state
  const [downPayment, setDownPayment] = useState("");
  const [termMonths, setTermMonths] = useState("36");
  const [interestRate] = useState(18); // Fixed rate for BHPH
  
  // Calculate estimated payment
  const calculatePayment = () => {
    if (!vehicle) return null;
    
    const principal = vehicle.price - (parseFloat(downPayment) || 0);
    if (principal <= 0) return null;
    
    const term = parseInt(termMonths) || 36;
    const termYears = term / 12;
    const totalInterest = principal * (interestRate / 100) * termYears;
    const totalPayment = principal + totalInterest;
    const monthlyPayment = totalPayment / term;
    
    return {
      principal,
      totalInterest,
      totalPayment,
      monthlyPayment,
    };
  };
  
  const paymentCalc = calculatePayment();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };
  
  const handleSubmit = async () => {
    // Validate form
    const result = applicationSchema.safeParse({
      fullName,
      email,
      phone,
      address,
    });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    
    setErrors({});
    setLoading(true);
    
    try {
      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("purchase_applications")
        .insert({
          vehicle_id: vehicle?.id,
          user_id: user?.id || null,
          full_name: fullName,
          email,
          phone,
          address,
          down_payment: parseFloat(downPayment) || 0,
          desired_term_months: parseInt(termMonths) || 36,
          estimated_monthly_payment: paymentCalc?.monthlyPayment || 0,
          notes,
          status: "pending",
        });
      
      if (error) throw error;
      
      // Send email notification to admin
      const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      await supabase.functions.invoke("send-purchase-application", {
        body: {
          vehicleInfo,
          vehiclePrice: vehicle.price,
          fullName,
          email,
          phone,
          address,
          downPayment: parseFloat(downPayment) || 0,
          termMonths: parseInt(termMonths) || 36,
          estimatedMonthlyPayment: paymentCalc?.monthlyPayment || 0,
          notes,
        },
      });
      
      setStep("success");
      toast.success("Application submitted successfully!");
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoToPortal = () => {
    onOpenChange(false);
    navigate("/payments");
  };
  
  const resetForm = () => {
    setStep("form");
    setFullName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setNotes("");
    setDownPayment("");
    setTermMonths("36");
    setErrors({});
  };
  
  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setTimeout(resetForm, 300);
    }
  }, [open]);
  
  if (!vehicle) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {t("purchase.title")}
              </DialogTitle>
              <DialogDescription>
                {vehicle.year} {vehicle.make} {vehicle.model} - {formatCurrency(vehicle.price)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Payment Calculator */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("purchase.paymentCalculator")}</h3>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="downPayment">{t("purchase.downPayment")}</Label>
                      <Input
                        id="downPayment"
                        type="number"
                        placeholder="1000"
                        value={downPayment}
                        onChange={(e) => setDownPayment(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termMonths">{t("purchase.term")}</Label>
                      <Input
                        id="termMonths"
                        type="number"
                        placeholder="36"
                        value={termMonths}
                        onChange={(e) => setTermMonths(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {paymentCalc && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-background rounded-lg">
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">
                          {formatCurrency(paymentCalc.monthlyPayment)}
                        </div>
                        <div className="text-xs text-muted-foreground">{t("purchase.estMonthly")}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {formatCurrency(paymentCalc.principal)}
                        </div>
                        <div className="text-xs text-muted-foreground">{t("purchase.amountFinanced")}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {formatCurrency(paymentCalc.totalInterest)}
                        </div>
                        <div className="text-xs text-muted-foreground">{t("purchase.totalInterest")}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {formatCurrency(paymentCalc.totalPayment)}
                        </div>
                        <div className="text-xs text-muted-foreground">{t("purchase.totalPayment")}</div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-3">
                    {t("purchase.disclaimer").replace("{rate}", String(interestRate))}
                  </p>
                </CardContent>
              </Card>
              
              <Separator />
              
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t("purchase.yourInfo")}</h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t("purchase.fullName")}</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={errors.fullName ? "border-destructive" : ""}
                    />
                    {errors.fullName && (
                      <p className="text-xs text-destructive">{errors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("purchase.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("purchase.phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(470) 519-6717"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">{t("purchase.address")}</Label>
                  <Textarea
                    id="address"
                    placeholder="123 Main St, City, State ZIP"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={errors.address ? "border-destructive" : ""}
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive">{errors.address}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">{t("purchase.notes")}</Label>
                  <Textarea
                    id="notes"
                    placeholder={t("purchase.notesPlaceholder")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                {t("purchase.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("purchase.submitting")}
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    {t("purchase.submit")}
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">{t("purchase.successTitle")}</h2>
              <p className="text-muted-foreground">
                {t("purchase.successMessage").replace("{vehicle}", `${vehicle.year} ${vehicle.make} ${vehicle.model}`)}
              </p>
            </div>
            
            {paymentCalc && (
              <Card className="bg-muted/50 max-w-sm mx-auto">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">{t("purchase.estPayment")}</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(paymentCalc.monthlyPayment)}{t("purchase.perMonth")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("purchase.forMonths").replace("{months}", termMonths)}
                  </p>
                </CardContent>
              </Card>
            )}
            
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("purchase.continueBrowsing")}
              </Button>
              <Button onClick={handleGoToPortal}>
                {t("purchase.goToPortal")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
