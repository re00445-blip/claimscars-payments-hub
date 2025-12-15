import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, FileText, Clock, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { useLanguage } from "@/contexts/LanguageContext";

const claimFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Please enter a valid address"),
  accidentDate: z.string().min(1, "Please select the accident date"),
  injuryArea: z.string().min(2, "Please describe the area of injury"),
  atFault: z.string().min(1, "Please indicate if you were at fault"),
  contactNumber: z.string().min(10, "Please enter a valid phone number"),
  referralSource: z.string().optional(),
});

const Claims = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  
  const referralCode = searchParams.get("ref");
  
  const form = useForm<z.infer<typeof claimFormSchema>>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      name: "",
      address: "",
      accidentDate: "",
      injuryArea: "",
      atFault: "",
      contactNumber: "",
      referralSource: referralCode || "",
    },
  });

  // Look up affiliate by referral code
  useEffect(() => {
    const lookupAffiliate = async () => {
      if (referralCode) {
        const { data } = await supabase
          .from("marketing_affiliates")
          .select("id")
          .eq("referral_code", referralCode)
          .eq("status", "active")
          .maybeSingle();
        
        if (data) {
          setAffiliateId(data.id);
        }
      }
    };
    lookupAffiliate();
  }, [referralCode]);

  const onSubmit = async (values: z.infer<typeof claimFormSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-injury-claim", {
        body: {
          ...values,
          attachments: uploadedFiles,
          affiliateId: affiliateId,
        },
      });

      if (error) throw error;

      toast({
        title: t("claims.claimSubmitted"),
        description: t("claims.claimSubmittedDesc"),
      });
      
      form.reset();
      setUploadedFiles([]);
    } catch (error) {
      console.error("Error submitting claim:", error);
      toast({
        title: t("claims.submissionFailed"),
        description: t("claims.submissionFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("claims.title")}</h1>
          <p className="text-muted-foreground text-lg">
            {t("claims.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t("claims.expertGuidance")}</CardTitle>
              <CardDescription>
                {t("claims.expertGuidanceDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("claims.expertGuidanceText")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>{t("claims.docSupport")}</CardTitle>
              <CardDescription>
                {t("claims.docSupportDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("claims.docSupportText")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t("claims.fastProcessing")}</CardTitle>
              <CardDescription>
                {t("claims.fastProcessingDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("claims.fastProcessingText")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>{t("claims.confidential")}</CardTitle>
              <CardDescription>
                {t("claims.confidentialDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("claims.confidentialText")}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t("claims.submitClaim")}</CardTitle>
            <CardDescription>
              {t("claims.submitClaimDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("claims.name")} *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="John Doe"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactNumber">{t("claims.contactNumber")} *</Label>
                  <Input
                    id="contactNumber"
                    {...form.register("contactNumber")}
                    placeholder="(555) 123-4567"
                  />
                  {form.formState.errors.contactNumber && (
                    <p className="text-sm text-destructive">{form.formState.errors.contactNumber.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("claims.address")} *</Label>
                <Input
                  id="address"
                  {...form.register("address")}
                  placeholder="123 Main St, City, State ZIP"
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accidentDate">{t("claims.accidentDate")} *</Label>
                  <Input
                    id="accidentDate"
                    type="date"
                    {...form.register("accidentDate")}
                  />
                  {form.formState.errors.accidentDate && (
                    <p className="text-sm text-destructive">{form.formState.errors.accidentDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="atFault">{t("claims.atFault")} *</Label>
                  <Select onValueChange={(value) => form.setValue("atFault", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("claims.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{t("claims.yes")}</SelectItem>
                      <SelectItem value="no">{t("claims.no")}</SelectItem>
                      <SelectItem value="partial">{t("claims.partial")}</SelectItem>
                      <SelectItem value="unknown">{t("claims.unknown")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.atFault && (
                    <p className="text-sm text-destructive">{form.formState.errors.atFault.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="injuryArea">{t("claims.injuryArea")} *</Label>
                <Input
                  id="injuryArea"
                  {...form.register("injuryArea")}
                  placeholder={t("claims.injuryAreaPlaceholder")}
                />
                {form.formState.errors.injuryArea && (
                  <p className="text-sm text-destructive">{form.formState.errors.injuryArea.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("claims.photosVideos")}</Label>
                <FileUpload
                  folder="claims"
                  onFilesChange={setUploadedFiles}
                  maxFiles={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralSource">{t("claims.referralSource")}</Label>
                <Input
                  id="referralSource"
                  {...form.register("referralSource")}
                  placeholder={t("claims.referralSourcePlaceholder")}
                />
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? t("claims.submitting") : t("claims.submitClaimBtn")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Claims;