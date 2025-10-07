import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Car, Scale, User, Wrench } from "lucide-react";
import logo from "@/assets/cars-claims-logo.png";

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4">
        <div className="flex h-16 items-center justify-between relative">
          <Link to="/" className="absolute inset-0 flex flex-col items-center justify-center">
            <img src={logo} alt="Cars and Claims" className="h-14 w-full object-contain" />
            <div className="text-xs text-muted-foreground mt-0.5">
              Quality Foreign and Domestic Auto's
            </div>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 relative z-10">
            <Link to="/inventory" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              <Car className="h-4 w-4" />
              Inventory
            </Link>
            <Link to="/repairs" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              <Wrench className="h-4 w-4" />
              Car Repairs
            </Link>
            <Link to="/claims" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              <Scale className="h-4 w-4" />
              Injury Claims
            </Link>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-2" />
                Login
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
