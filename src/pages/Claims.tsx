import { Navbar } from "@/components/Navbar";
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
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";

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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof claimFormSchema>>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      name: "",
      address: "",
      accidentDate: "",
      injuryArea: "",
      atFault: "",
      contactNumber: "",
      referralSource: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof claimFormSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-injury-claim", {
        body: {
          ...values,
          attachments: uploadedFiles,
        },
      });

      if (error) throw error;

      toast({
        title: "Claim Submitted",
        description: "We've received your claim information and will contact you soon!",
      });
      
      form.reset();
      setUploadedFiles([]);
    } catch (error) {
      console.error("Error submitting claim:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your claim. Please try again.",
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
          <h1 className="text-4xl font-bold mb-2">No-Fault Injury Claims</h1>
          <p className="text-muted-foreground text-lg">
            Professional assistance for your injury claim needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Expert Guidance</CardTitle>
              <CardDescription>
                Navigate the claims process with professional support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our experienced team helps you understand your rights and navigate the no-fault claim process efficiently.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Documentation Support</CardTitle>
              <CardDescription>
                Help with all required paperwork and documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We assist with gathering and organizing all necessary documentation to support your claim.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Fast Processing</CardTitle>
              <CardDescription>
                Quick turnaround on claim submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We work efficiently to ensure your claim is processed as quickly as possible.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Confidential Service</CardTitle>
              <CardDescription>
                Your information is protected and secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We maintain strict confidentiality and protect your personal information throughout the process.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Submit an Injury Claim</CardTitle>
            <CardDescription>
              Fill out the form below and our team will contact you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
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
                  <Label htmlFor="contactNumber">Best Contact Number *</Label>
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
                <Label htmlFor="address">Address *</Label>
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
                  <Label htmlFor="accidentDate">Accident Date *</Label>
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
                  <Label htmlFor="atFault">Were You At Fault? *</Label>
                  <Select onValueChange={(value) => form.setValue("atFault", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="partial">Partially</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.atFault && (
                    <p className="text-sm text-destructive">{form.formState.errors.atFault.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="injuryArea">Area of Bodily Injury *</Label>
                <Input
                  id="injuryArea"
                  {...form.register("injuryArea")}
                  placeholder="e.g., Lower back, Neck, etc."
                />
                {form.formState.errors.injuryArea && (
                  <p className="text-sm text-destructive">{form.formState.errors.injuryArea.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Photos/Videos of Injury or Accident (Optional)</Label>
                <FileUpload
                  folder="claims"
                  onFilesChange={setUploadedFiles}
                  maxFiles={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralSource">How Did You Hear About Us? (Optional)</Label>
                <Input
                  id="referralSource"
                  {...form.register("referralSource")}
                  placeholder="e.g., Friend, Google, Social Media, etc."
                />
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? "Submitting..." : "Submit Claim"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Claims;
