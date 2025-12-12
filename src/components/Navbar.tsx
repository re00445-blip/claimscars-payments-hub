import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Car, Scale, User, Wrench } from "lucide-react";
import logo from "@/assets/cars-claims-logo-new.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

export const Navbar = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const { t } = useLanguage();

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
          {/* Left side - Language toggle on mobile, nav links on desktop */}
          <div className="flex items-center gap-4 z-10">
            <div className="sm:hidden">
              <LanguageToggle />
            </div>
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>
            <Link to="/inventory" className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              <Car className="h-4 w-4" />
              {t("nav.inventory")}
            </Link>
            <Link to="/repairs" className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              <Wrench className="h-4 w-4" />
              {t("nav.carRepairs")}
            </Link>
            <Link to="/claims" className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              <Scale className="h-4 w-4" />
              {t("nav.injuryClaims")}
            </Link>
          </div>

          {/* Center - Logo */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center">
            <img src={logo} alt="Cars and Claims" className="h-10 md:h-12 w-auto object-contain scale-x-125" />
            <div className="hidden md:block text-xs text-muted-foreground mt-0.5">
              {t("nav.tagline")}
            </div>
          </Link>

          {/* Right side - Account icon + Get Started on mobile, Login + Get Started on desktop */}
          <div className="flex items-center gap-3 z-10">
            <Link to={userName ? "/dashboard" : "/auth"} className="md:hidden">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4" />
                {userName && <span className="ml-1 max-w-[80px] truncate text-xs">{userName}</span>}
              </Button>
            </Link>
            <Link to={userName ? "/dashboard" : "/auth"} className="hidden md:block">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-2" />
                {userName || t("nav.login")}
              </Button>
            </Link>
            <Link to={userName ? "/dashboard" : "/auth"}>
              <Button size="sm">{userName ? t("nav.dashboard") : t("nav.getStarted")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
