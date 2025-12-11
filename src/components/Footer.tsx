import { Phone } from "lucide-react";
import carsClaimsLogo from "@/assets/cars-claims-logo-new.jpg";

const Footer = () => {
  return (
    <footer className="border-t py-12 bg-muted/30">
      <div className="container px-4">
        <div className="flex flex-col items-center gap-4">
          <img 
            src={carsClaimsLogo} 
            alt="Cars & Claims Logo" 
            className="h-24 w-auto opacity-80"
          />
          <div className="flex items-center gap-2 text-primary font-semibold text-lg">
            <Phone className="h-5 w-5" />
            <a href="tel:470-519-6717" className="hover:underline">
              Contact Us: 470-519-6717
            </a>
          </div>
          <div className="text-center text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Cars & Claims | Quality Foreign and Domestic Auto's</p>
            <p className="text-sm">Professional and hassle free car sale process</p>
            <p>&copy; 2025 All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
