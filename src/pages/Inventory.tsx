import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { Loader2 } from "lucide-react";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  color: string;
  description: string;
  images: string[];
  status: string;
}

const Inventory = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVehicles(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Vehicle Inventory</h1>
          <p className="text-muted-foreground text-lg">
            Browse our selection of quality foreign and domestic vehicles
          </p>
        </div>

        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No vehicles available at the moment. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {vehicle.images && vehicle.images.length > 0 && (
                  <div className="aspect-video bg-muted" />
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </CardTitle>
                    <Badge variant="secondary">{vehicle.color}</Badge>
                  </div>
                  <CardDescription>
                    {vehicle.mileage?.toLocaleString()} miles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {vehicle.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      ${vehicle.price.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
