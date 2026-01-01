import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DropdownOption {
  id: string;
  category: string;
  value: string;
  is_active: boolean;
  sort_order: number;
}

export const useDropdownOptions = () => {
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("dropdown_options")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error("Error fetching dropdown options:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOptionsByCategory = (category: string): string[] => {
    return options
      .filter(o => o.category === category)
      .map(o => o.value);
  };

  const vendors = getOptionsByCategory("vendor");
  const classifications = getOptionsByCategory("classification");
  const paymentMethods = getOptionsByCategory("payment_method");

  return {
    options,
    loading,
    vendors,
    classifications,
    paymentMethods,
    refetch: fetchOptions,
  };
};
