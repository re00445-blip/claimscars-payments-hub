import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Loader2, Car, DollarSign, Calendar, Phone } from "lucide-react";
import { VehicleImageGallery } from "@/components/VehicleImageGallery";
import { PurchaseIntakeDialog } from "@/components/PurchaseIntakeDialog";

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
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [intakeDialogOpen, setIntakeDialogOpen] = useState(false);

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

  const handleBuyNow = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIntakeDialogOpen(true);
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="overflow-hidden hover:shadow-xl transition-shadow flex flex-col">
                {/* Image Section */}
                <div className="relative aspect-[4/3]">
                  <VehicleImageGallery 
                    images={vehicle.images || []} 
                    vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    compact
                  />
                  <Badge className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-xs">
                    {vehicle.images?.length || 0} Photos
                  </Badge>
                </div>

                {/* Vehicle Details Section */}
                <CardContent className="p-4 flex flex-col flex-1">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-foreground mb-1">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h2>
                    <div className="flex items-center gap-1 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {vehicle.color}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {vehicle.mileage?.toLocaleString()} mi
                      </Badge>
                    </div>
                    
                    {vehicle.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {vehicle.description}
                      </p>
                    )}
                    
                    <p className="text-2xl font-bold text-primary mb-3">
                      ${vehicle.price.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Button 
                      size="sm"
                      className="flex-1"
                      onClick={() => window.location.href = 'tel:+14705196717'}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button 
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleBuyNow(vehicle)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Buy Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PurchaseIntakeDialog
        open={intakeDialogOpen}
        onOpenChange={setIntakeDialogOpen}
        vehicle={selectedVehicle}
      />

      <Footer />
    </div>
  );
};

export default Inventory;
