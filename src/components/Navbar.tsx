import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Car, Scale, User, Wrench } from "lucide-react";
import logo from "@/assets/cars-claims-logo-new.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Navbar = () => {
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || 
                       session.user.email?.split('@')[0] || 
                       'Account';
          setUserName(name);
        } else {
          setUserName(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || 
                     session.user.email?.split('@')[0] || 
                     'Account';
        setUserName(name);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Login button on mobile, nav links on desktop */}
          <div className="flex items-center gap-6 z-10">
            <Link to="/auth" className="md:hidden">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/inventory" className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              <Car className="h-4 w-4" />
              Inventory
            </Link>
            <Link to="/repairs" className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              <Wrench className="h-4 w-4" />
              Car Repairs
            </Link>
            <Link to="/claims" className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              <Scale className="h-4 w-4" />
              Injury Claims
            </Link>
          </div>

          {/* Center - Logo */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center">
            <img src={logo} alt="Cars and Claims" className="h-10 md:h-12 w-auto object-contain scale-x-125" />
            <div className="hidden md:block text-xs text-muted-foreground mt-0.5">
              Quality Foreign and Domestic Auto's
            </div>
          </Link>

          {/* Right side - Get Started on mobile, Login + Get Started on desktop */}
          <div className="flex items-center gap-3 z-10">
            <Link to={userName ? "/dashboard" : "/auth"} className="hidden md:block">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-2" />
                {userName || "Login"}
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
