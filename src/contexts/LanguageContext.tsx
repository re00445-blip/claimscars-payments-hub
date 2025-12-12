import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navbar
    "nav.inventory": "Inventory",
    "nav.carRepairs": "Car Repairs",
    "nav.injuryClaims": "Injury Claims",
    "nav.login": "Login",
    "nav.dashboard": "Dashboard",
    "nav.getStarted": "Get Started",
    "nav.tagline": "Quality Foreign and Domestic Auto's",
    
    // Hero
    "hero.title": "Cars & Claims",
    "hero.subtitle": "Your trusted marketing partner for vehicle sales, financing and non-fault injury and property damage claims",
    "hero.viewInventory": "View Inventory",
    "hero.injuryClaims": "Injury Claims",
    "hero.carRepairs": "Car Repairs",
    "hero.bhph": "BHPH",
    
    // Services
    "services.title": "Our Services",
    "services.subtitle": "Everything you need in one place",
    "services.autoSales": "Auto Sales",
    "services.autoSalesDesc": "Foreign and domestic used vehicles with transparent pricing",
    "services.bhphFinancing": "Buy-here-pay-here financing",
    "services.digitalReceipts": "Digital payment receipts",
    "services.flexiblePayments": "Flexible payment schedules",
    "services.carRepairs": "Car Repairs",
    "services.carRepairsDesc": "Professional auto repair and maintenance services",
    "services.expertMechanics": "Expert mechanics",
    "services.fastTurnaround": "Fast turnaround times",
    "services.qualityParts": "Quality parts & service",
    "services.injuryClaims": "Injury Claims",
    "services.injuryClaimsDesc": "Professional no-fault injury claim assistance",
    "services.expertProcessing": "Expert claim processing",
    "services.docSupport": "Documentation support",
    "services.fastResolution": "Fast claim resolution",
    
    // CTA
    "cta.title": "Ready to get started?",
    "cta.subtitle": "Create an account to manage your payments or browse our inventory",
    "cta.createAccount": "Create Account",
    
    // Footer
    "footer.contactUs": "Contact Us",
    
    // Language Toggle
    "lang.english": "EN",
    "lang.spanish": "ES",
  },
  es: {
    // Navbar
    "nav.inventory": "Inventario",
    "nav.carRepairs": "Reparaciones",
    "nav.injuryClaims": "Reclamos",
    "nav.login": "Iniciar Sesión",
    "nav.dashboard": "Panel",
    "nav.getStarted": "Comenzar",
    "nav.tagline": "Autos Extranjeros y Domésticos de Calidad",
    
    // Hero
    "hero.title": "Cars & Claims",
    "hero.subtitle": "Su socio de confianza para ventas de vehículos, financiamiento y reclamos por lesiones y daños a la propiedad sin culpa",
    "hero.viewInventory": "Ver Inventario",
    "hero.injuryClaims": "Reclamos por Lesiones",
    "hero.carRepairs": "Reparaciones de Autos",
    "hero.bhph": "BHPH",
    
    // Services
    "services.title": "Nuestros Servicios",
    "services.subtitle": "Todo lo que necesitas en un solo lugar",
    "services.autoSales": "Venta de Autos",
    "services.autoSalesDesc": "Vehículos usados extranjeros y domésticos con precios transparentes",
    "services.bhphFinancing": "Financiamiento compre-aquí-pague-aquí",
    "services.digitalReceipts": "Recibos de pago digitales",
    "services.flexiblePayments": "Horarios de pago flexibles",
    "services.carRepairs": "Reparaciones de Autos",
    "services.carRepairsDesc": "Servicios profesionales de reparación y mantenimiento",
    "services.expertMechanics": "Mecánicos expertos",
    "services.fastTurnaround": "Tiempos de entrega rápidos",
    "services.qualityParts": "Piezas y servicio de calidad",
    "services.injuryClaims": "Reclamos por Lesiones",
    "services.injuryClaimsDesc": "Asistencia profesional en reclamos sin culpa",
    "services.expertProcessing": "Procesamiento experto de reclamos",
    "services.docSupport": "Soporte de documentación",
    "services.fastResolution": "Resolución rápida de reclamos",
    
    // CTA
    "cta.title": "¿Listo para comenzar?",
    "cta.subtitle": "Cree una cuenta para administrar sus pagos o explore nuestro inventario",
    "cta.createAccount": "Crear Cuenta",
    
    // Footer
    "footer.contactUs": "Contáctenos",
    
    // Language Toggle
    "lang.english": "EN",
    "lang.spanish": "ES",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
