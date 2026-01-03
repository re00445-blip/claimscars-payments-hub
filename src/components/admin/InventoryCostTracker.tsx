import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  cost_price: number | null;
  status: string;
}

export const InventoryCostTracker = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCosts, setEditingCosts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, price, cost_price, status')
        .order('year', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
      
      // Initialize editing costs with current values
      const costs: Record<string, string> = {};
      data?.forEach(v => {
        costs[v.id] = v.cost_price?.toString() || '';
      });
      setEditingCosts(costs);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCost = async (vehicleId: string) => {
    const costValue = editingCosts[vehicleId];
    const numericCost = costValue ? parseFloat(costValue) : 0;

    if (isNaN(numericCost) || numericCost < 0) {
      toast.error('Please enter a valid cost');
      return;
    }

    setSavingId(vehicleId);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ cost_price: numericCost })
        .eq('id', vehicleId);

      if (error) throw error;
      
      setVehicles(prev => prev.map(v => 
        v.id === vehicleId ? { ...v, cost_price: numericCost } : v
      ));
      toast.success('Cost updated successfully');
    } catch (error) {
      console.error('Error updating cost:', error);
      toast.error('Failed to update cost');
    } finally {
      setSavingId(null);
    }
  };

  const calculateProfit = (listPrice: number, costPrice: number | null) => {
    if (!costPrice) return null;
    return listPrice - costPrice;
  };

  const calculateMargin = (listPrice: number, costPrice: number | null) => {
    if (!costPrice || listPrice === 0) return null;
    return ((listPrice - costPrice) / listPrice) * 100;
  };

  const totalListPrice = vehicles.reduce((sum, v) => sum + Number(v.price), 0);
  const totalCostPrice = vehicles.reduce((sum, v) => sum + (Number(v.cost_price) || 0), 0);
  const totalProfit = totalListPrice - totalCostPrice;

  if (loading) {
    return <div className="p-4">Loading vehicles...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total List Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalListPrice.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCostPrice.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Potential Profit</CardTitle>
            {totalProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalProfit.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Cost vs Listing Price</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">List Price</TableHead>
                <TableHead className="text-right">Actual Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => {
                const profit = calculateProfit(Number(vehicle.price), vehicle.cost_price);
                const margin = calculateMargin(Number(vehicle.price), vehicle.cost_price);
                
                return (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                        vehicle.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {vehicle.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(vehicle.price).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={editingCosts[vehicle.id] || ''}
                        onChange={(e) => setEditingCosts(prev => ({
                          ...prev,
                          [vehicle.id]: e.target.value
                        }))}
                        placeholder="Enter cost"
                        className="w-28 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {profit !== null ? (
                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${profit.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {margin !== null ? (
                        <span className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {margin.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleSaveCost(vehicle.id)}
                        disabled={savingId === vehicle.id}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
