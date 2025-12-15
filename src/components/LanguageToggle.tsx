import { useLanguage } from "@/contexts/LanguageContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const LanguageToggle = () => {
  const { language, setLanguage, t } = useLanguage();

  const handleToggle = (checked: boolean) => {
    setLanguage(checked ? "es" : "en");
  };

  return (
    <div className="flex items-center gap-2">
      <Label 
        htmlFor="language-toggle" 
        className={`text-xs font-medium transition-colors ${language === "en" ? "text-foreground" : "text-muted-foreground"}`}
      >
        {t("lang.english")}
      </Label>
      <Switch
        id="language-toggle"
        checked={language === "es"}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary"
      />
      <Label 
        htmlFor="language-toggle" 
        className={`text-xs font-medium transition-colors ${language === "es" ? "text-foreground" : "text-muted-foreground"}`}
      >
        {t("lang.spanish")}
      </Label>
    </div>
  );
};
