import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, FileText, Clock, Shield } from "lucide-react";

const Claims = () => {
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

        <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-2xl">Need Help with a Claim?</CardTitle>
            <CardDescription className="text-primary-foreground/90">
              Contact us to discuss your no-fault injury claim
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-primary-foreground/90 mb-4">
              Our team is ready to assist you with your claim. Please call us or visit our office to get started.
            </p>
            <div className="space-y-2">
              <p className="font-semibold">Contact Information:</p>
              <p>Phone: [Your Phone Number]</p>
              <p>Email: [Your Email]</p>
              <p>Office Hours: [Your Hours]</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Claims;
