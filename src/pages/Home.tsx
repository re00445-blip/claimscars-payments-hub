import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Scale, DollarSign, FileText, Clock, Shield, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ChatBot } from "@/components/ChatBot";
import heroImage from "@/assets/hero-cars.jpg";
import carsClaimsLogo from "@/assets/cars-claims-logo-new.jpg";

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
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-primary">
              Cars & Claims
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your trusted marketing partner for vehicle sales, financing and non-fault injury and property damage claims
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/inventory">
                <Button size="lg" className="text-base px-6 bg-primary hover:bg-primary/90">
                  <Car className="mr-2 h-5 w-5" />
                  View Inventory
                </Button>
              </Link>
              <Link to="/claims">
                <Button size="lg" className="text-base px-6 bg-primary hover:bg-primary/90">
                  <Scale className="mr-2 h-5 w-5" />
                  Injury Claims
                </Button>
              </Link>
              <Link to="/repairs">
                <Button size="lg" className="text-base px-6 bg-primary hover:bg-primary/90">
                  <Wrench className="mr-2 h-5 w-5" />
                  Car Repairs
                </Button>
              </Link>
              <Link to="/payments">
                <Button size="lg" className="text-base px-6 bg-primary hover:bg-primary/90">
                  <DollarSign className="mr-2 h-5 w-5" />
                  BHPH
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

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                  <Wrench className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-2xl">Car Repairs</CardTitle>
                <CardDescription className="text-base">
                  Professional auto repair and maintenance services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-accent" />
                    <span>Expert mechanics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" />
                    <span>Fast turnaround times</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" />
                    <span>Quality parts & service</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Injury Claims</CardTitle>
                <CardDescription className="text-base">
                  Professional no-fault injury claim assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Expert claim processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Documentation support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
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

      <Footer />
      <ChatBot />
    </div>
  );
};

export default Home;
