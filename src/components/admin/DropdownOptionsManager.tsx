import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, GripVertical, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DropdownOption {
  id: string;
  category: string;
  value: string;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { key: "vendor", label: "Vendors" },
  { key: "classification", label: "Classifications" },
  { key: "payment_method", label: "Payment Methods" },
];

export const DropdownOptionsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [newValue, setNewValue] = useState("");
  const [activeCategory, setActiveCategory] = useState("vendor");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dropdown_options")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setOptions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter a value",
        variant: "destructive",
      });
      return;
    }

    try {
      const categoryOptions = options.filter(o => o.category === activeCategory);
      const maxOrder = categoryOptions.length > 0 
        ? Math.max(...categoryOptions.map(o => o.sort_order)) 
        : 0;

      const { error } = await supabase.from("dropdown_options").insert({
        category: activeCategory,
        value: newValue.trim(),
        sort_order: maxOrder + 1,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Option added" });
      setNewValue("");
      fetchOptions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("dropdown_options")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      fetchOptions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("dropdown_options")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Option deleted" });
      fetchOptions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredOptions = options.filter(o => o.category === activeCategory);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Manage Dropdowns
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Dropdown Options</DialogTitle>
        </DialogHeader>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-3">
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat.key} value={cat.key}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat.key} value={cat.key} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={`Add new ${cat.label.toLowerCase().slice(0, -1)}...`}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <Button onClick={handleAdd} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Value</TableHead>
                      <TableHead className="w-24 text-center">Active</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOptions.map((option) => (
                      <TableRow key={option.id}>
                        <TableCell>{option.value}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={option.is_active}
                            onCheckedChange={() => handleToggleActive(option.id, option.is_active)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(option.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredOptions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No options found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
