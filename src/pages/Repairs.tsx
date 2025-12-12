import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Wrench, Clock, Shield, CheckCircle, Settings, Gauge } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { useLanguage } from "@/contexts/LanguageContext";

const repairFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(5, "Please enter a valid address"),
  year: z.string().min(4, "Please enter a valid year"),
  make: z.string().min(2, "Please enter the vehicle make"),
  model: z.string().min(2, "Please enter the vehicle model"),
  description: z.string().min(10, "Please provide more details about the issue"),
});

const Repairs = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof repairFormSchema>>({
    resolver: zodResolver(repairFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      year: "",
      make: "",
      model: "",
      description: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof repairFormSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-repair-inquiry", {
        body: {
          ...values,
          attachments: uploadedFiles,
        },
      });

      if (error) throw error;

      toast({
        title: t("repairs.inquirySubmitted"),
        description: t("repairs.inquirySubmittedDesc"),
      });
      
      form.reset();
      setUploadedFiles([]);
    } catch (error) {
      console.error("Error submitting repair inquiry:", error);
      toast({
        title: t("repairs.submissionFailed"),
        description: t("repairs.submissionFailedDesc"),
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
          <h1 className="text-4xl font-bold mb-2">{t("repairs.title")}</h1>
          <p className="text-muted-foreground text-lg">
            {t("repairs.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t("repairs.expertMechanics")}</CardTitle>
              <CardDescription>
                {t("repairs.expertMechanicsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("repairs.expertMechanicsText")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>{t("repairs.fastService")}</CardTitle>
              <CardDescription>
                {t("repairs.fastServiceDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("repairs.fastServiceText")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t("repairs.completeService")}</CardTitle>
              <CardDescription>
                {t("repairs.completeServiceDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("repairs.completeServiceText")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>{t("repairs.qualityParts")}</CardTitle>
              <CardDescription>
                {t("repairs.qualityPartsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("repairs.qualityPartsText")}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">{t("repairs.servicesInclude")}</CardTitle>
            <CardDescription>
              {t("repairs.servicesIncludeDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">{t("repairs.engineDiagnostics")}</h3>
                  <p className="text-sm text-muted-foreground">{t("repairs.engineDiagnosticsDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">{t("repairs.brakeServices")}</h3>
                  <p className="text-sm text-muted-foreground">{t("repairs.brakeServicesDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">{t("repairs.transmissionService")}</h3>
                  <p className="text-sm text-muted-foreground">{t("repairs.transmissionServiceDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">{t("repairs.oilChanges")}</h3>
                  <p className="text-sm text-muted-foreground">{t("repairs.oilChangesDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">{t("repairs.suspension")}</h3>
                  <p className="text-sm text-muted-foreground">{t("repairs.suspensionDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">{t("repairs.electrical")}</h3>
                  <p className="text-sm text-muted-foreground">{t("repairs.electricalDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">{t("repairs.acHeating")}</h3>
                  <p className="text-sm text-muted-foreground">{t("repairs.acHeatingDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">{t("repairs.tireServices")}</h3>
                  <p className="text-sm text-muted-foreground">{t("repairs.tireServicesDesc")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Gauge className="h-6 w-6" />
              {t("repairs.requestQuote")}
            </CardTitle>
            <CardDescription>
              {t("repairs.requestQuoteDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("repairs.name")} *</Label>
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
                  <Label htmlFor="phone">{t("repairs.phone")} *</Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    placeholder="(555) 123-4567"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("repairs.address")} *</Label>
                <Input
                  id="address"
                  {...form.register("address")}
                  placeholder="123 Main St, City, State ZIP"
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">{t("repairs.year")} *</Label>
                  <Input
                    id="year"
                    {...form.register("year")}
                    placeholder="2020"
                  />
                  {form.formState.errors.year && (
                    <p className="text-sm text-destructive">{form.formState.errors.year.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="make">{t("repairs.make")} *</Label>
                  <Input
                    id="make"
                    {...form.register("make")}
                    placeholder="Toyota"
                  />
                  {form.formState.errors.make && (
                    <p className="text-sm text-destructive">{form.formState.errors.make.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">{t("repairs.model")} *</Label>
                  <Input
                    id="model"
                    {...form.register("model")}
                    placeholder="Camry"
                  />
                  {form.formState.errors.model && (
                    <p className="text-sm text-destructive">{form.formState.errors.model.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("repairs.issueDescription")} *</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder={t("repairs.issueDescriptionPlaceholder")}
                  className="min-h-[120px]"
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("repairs.photosVideos")}</Label>
                <FileUpload
                  folder="repairs"
                  onFilesChange={setUploadedFiles}
                  maxFiles={5}
                />
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? t("repairs.submitting") : t("repairs.submitInquiry")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Repairs;