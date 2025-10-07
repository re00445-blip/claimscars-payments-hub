import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Scale, DollarSign, FileText, Clock, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import heroImage from "@/assets/hero-cars.jpg";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent" />
        </div>
        
        <div className="container relative z-10 px-4">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Quality Cars. <br />Fair Financing. <br />Legal Support.
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-xl">
              Foreign and domestic used cars with flexible buy-here-pay-here options. 
              Plus comprehensive no-fault injury claim services.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/inventory">
                <Button size="lg" className="text-lg px-8">
                  <Car className="mr-2 h-5 w-5" />
                  View Inventory
                </Button>
              </Link>
              <Link to="/claims">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  <Scale className="mr-2 h-5 w-5" />
                  File a Claim
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-muted/50">
        <div className="container px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-xl text-muted-foreground">Everything you need in one place</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Auto Sales</CardTitle>
                <CardDescription className="text-base">
                  Foreign and domestic used vehicles with transparent pricing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span>Buy-here-pay-here financing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Digital payment receipts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Flexible payment schedules</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Scale className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-2xl">Injury Claims</CardTitle>
                <CardDescription className="text-base">
                  Professional no-fault injury claim assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" />
                    <span>Expert claim processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    <span>Documentation support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" />
                    <span>Fast claim resolution</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container px-4">
          <Card className="max-w-4xl mx-auto text-center p-8 md:p-12 bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl mb-4">
                Ready to get started?
              </CardTitle>
              <CardDescription className="text-lg text-primary-foreground/90">
                Create an account to manage your payments or browse our inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Create Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container px-4">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2025 Cars and Claims. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
