import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Loader2, Car, DollarSign, Calendar, Phone } from "lucide-react";
import { VehicleImageGallery } from "@/components/VehicleImageGallery";

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
            Browse our selection of quality foreign and domestic vehicles from Quality Foreign and Domestic Auto's
          </p>
        </div>

        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No vehicles available at the moment. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Image Gallery Section */}
                  <div className="relative">
                    <VehicleImageGallery 
                      images={vehicle.images || []} 
                      vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    />
                    <Badge className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground">
                      {vehicle.images?.length || 0} Photos
                    </Badge>
                    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                      <Button 
                        onClick={() => window.location.href = 'tel:+14705196717'}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Contact Us
                      </Button>
                      <Button 
                        variant="secondary"
                        onClick={() => window.location.href = '/payments'}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Buy Now
                      </Button>
                    </div>
                  </div>

                  {/* Vehicle Details Section */}
                  <div className="p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h2 className="text-3xl font-bold text-foreground">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </h2>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-sm">
                              {vehicle.color}
                            </Badge>
                            <Badge variant="secondary" className="text-sm">
                              {vehicle.mileage?.toLocaleString()} miles
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                        {vehicle.description}
                      </p>
                    </div>

                    {/* Pricing Section */}
                    <div className="space-y-4 border-t pt-6">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Out the Door Price</p>
                          <p className="text-4xl font-bold text-primary">
                            ${vehicle.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          <span className="font-semibold">Financing Available</span>
                        </div>
                        <p className="text-muted-foreground">
                          Buy Here Pay Here financing with in-house options. Contact us for details on down payment and monthly terms.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Car className="h-5 w-5" />
                        <span>Quality Foreign and Domestic Auto's</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
