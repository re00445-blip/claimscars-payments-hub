import { Navbar } from "@/components/Navbar";
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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
        body: values,
      });

      if (error) throw error;

      toast({
        title: "Inquiry Submitted",
        description: "We've received your repair inquiry and will contact you soon!",
      });
      
      form.reset();
    } catch (error) {
      console.error("Error submitting repair inquiry:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your inquiry. Please try again.",
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
          <h1 className="text-4xl font-bold mb-2">Car Repair Services</h1>
          <p className="text-muted-foreground text-lg">
            Professional auto repair and maintenance from Quality Foreign and Domestic Auto's
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Expert Mechanics</CardTitle>
              <CardDescription>
                Certified technicians with years of experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our skilled mechanics are trained to work on both foreign and domestic vehicles, ensuring quality repairs every time.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Fast Service</CardTitle>
              <CardDescription>
                Quick turnaround times without compromising quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We understand your time is valuable. Most repairs are completed within 24-48 hours.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Complete Service</CardTitle>
              <CardDescription>
                From oil changes to major repairs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We handle everything from routine maintenance to complex engine repairs and diagnostics.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Quality Parts</CardTitle>
              <CardDescription>
                OEM and high-quality aftermarket parts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We use only the best parts to ensure your vehicle runs smoothly and safely.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Our Services Include</CardTitle>
            <CardDescription>
              Comprehensive automotive repair and maintenance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Engine Diagnostics & Repair</h3>
                  <p className="text-sm text-muted-foreground">Complete engine services and troubleshooting</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Brake Services</h3>
                  <p className="text-sm text-muted-foreground">Brake pads, rotors, and complete brake system repair</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Transmission Service</h3>
                  <p className="text-sm text-muted-foreground">Transmission repair and maintenance</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Oil Changes & Tune-Ups</h3>
                  <p className="text-sm text-muted-foreground">Regular maintenance to keep your car running smoothly</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Suspension & Steering</h3>
                  <p className="text-sm text-muted-foreground">Alignment, shocks, and steering system repairs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Electrical Systems</h3>
                  <p className="text-sm text-muted-foreground">Battery, alternator, and electrical diagnostics</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">AC & Heating</h3>
                  <p className="text-sm text-muted-foreground">Climate control system repair and maintenance</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Tire Services</h3>
                  <p className="text-sm text-muted-foreground">Tire rotation, balancing, and replacement</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Gauge className="h-6 w-6" />
              Request a Repair Quote
            </CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you shortly
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
                  <Label htmlFor="phone">Phone Number *</Label>
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

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
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
                  <Label htmlFor="make">Make *</Label>
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
                  <Label htmlFor="model">Model *</Label>
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
                <Label htmlFor="description">Issue Description *</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Please describe the issue you're experiencing with your vehicle..."
                  className="min-h-[120px]"
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? "Submitting..." : "Submit Inquiry"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Repairs;
