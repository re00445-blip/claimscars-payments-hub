import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Clock, Shield, CheckCircle, Settings, Gauge } from "lucide-react";

const Repairs = () => {
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

        <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Gauge className="h-6 w-6" />
              Schedule Your Service Today
            </CardTitle>
            <CardDescription className="text-primary-foreground/90">
              Contact us to schedule an appointment or get a quote
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-primary-foreground/90 mb-4">
              Our team is ready to get your vehicle back on the road. Call us or visit our shop for expert automotive care.
            </p>
            <div className="space-y-2">
              <p className="font-semibold">Contact Information:</p>
              <p>Phone: [Your Phone Number]</p>
              <p>Email: [Your Email]</p>
              <p>Address: [Your Address]</p>
              <p>Hours: [Your Hours]</p>
            </div>
            <div className="mt-6">
              <Button variant="secondary" size="lg">
                Schedule Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Repairs;
