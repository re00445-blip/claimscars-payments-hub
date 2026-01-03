import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, DollarSign, TrendingUp, TrendingDown, Trash2, Plus, ChevronDown, ChevronUp, Printer, Upload, FileText, X, Undo2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  cost_price: number | null;
  status: string;
  vin?: string;
}

interface CostBreakdown {
  id: string;
  vehicle_id: string;
  category: string;
  description: string | null;
  amount: number;
}

interface CostDocument {
  id: string;
  vehicle_id: string;
  file_name: string;
  file_url: string;
  description: string | null;
  created_at: string;
}

const COST_CATEGORIES = [
  'Purchase Price',
  'Parts',
  'Labor',
  'Towing',
  'Inspection',
  'Registration/Title',
  'Detailing',
  'Repairs',
  'Other'
];

export const InventoryCostTracker = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isRamon, setIsRamon] = useState(false);
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [costBreakdowns, setCostBreakdowns] = useState<Record<string, CostBreakdown[]>>({});
  const [costDocuments, setCostDocuments] = useState<Record<string, CostDocument[]>>({});
  const [newBreakdown, setNewBreakdown] = useState<{ category: string; description: string; amount: string }>({
    category: '',
    description: '',
    amount: ''
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printVehicleId, setPrintVehicleId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVehicles();
    checkUserEmail();
  }, []);

  const checkUserEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === 'ramon@carsandclaims.com') {
      setIsRamon(true);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, price, cost_price, status, vin')
        .order('year', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
      
      const prices: Record<string, string> = {};
      data?.forEach(v => {
        prices[v.id] = v.price?.toString() || '';
      });
      setEditingPrices(prices);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const fetchCostBreakdowns = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_cost_breakdowns')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCostBreakdowns(prev => ({ ...prev, [vehicleId]: data || [] }));
    } catch (error) {
      console.error('Error fetching breakdowns:', error);
    }
  };

  const fetchCostDocuments = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_cost_documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCostDocuments(prev => ({ ...prev, [vehicleId]: data || [] }));
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleExpandVehicle = async (vehicleId: string) => {
    if (expandedVehicle === vehicleId) {
      setExpandedVehicle(null);
    } else {
      setExpandedVehicle(vehicleId);
      await Promise.all([
        fetchCostBreakdowns(vehicleId),
        fetchCostDocuments(vehicleId)
      ]);
    }
  };

  const handleAddBreakdown = async (vehicleId: string) => {
    if (!newBreakdown.category || !newBreakdown.amount) {
      toast.error('Please select a category and enter an amount');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vehicle_cost_breakdowns')
        .insert({
          vehicle_id: vehicleId,
          category: newBreakdown.category,
          description: newBreakdown.description || null,
          amount: parseFloat(newBreakdown.amount)
        })
        .select()
        .single();

      if (error) throw error;

      setCostBreakdowns(prev => ({
        ...prev,
        [vehicleId]: [...(prev[vehicleId] || []), data]
      }));

      // Update total cost_price
      await updateTotalCost(vehicleId);

      setNewBreakdown({ category: '', description: '', amount: '' });
      toast.success('Cost item added');
    } catch (error) {
      console.error('Error adding breakdown:', error);
      toast.error('Failed to add cost item');
    }
  };

  const handleDeleteBreakdown = async (vehicleId: string, breakdownId: string) => {
    try {
      const { error } = await supabase
        .from('vehicle_cost_breakdowns')
        .delete()
        .eq('id', breakdownId);

      if (error) throw error;

      setCostBreakdowns(prev => ({
        ...prev,
        [vehicleId]: prev[vehicleId]?.filter(b => b.id !== breakdownId) || []
      }));

      await updateTotalCost(vehicleId);
      toast.success('Cost item deleted');
    } catch (error) {
      console.error('Error deleting breakdown:', error);
      toast.error('Failed to delete cost item');
    }
  };

  const updateTotalCost = async (vehicleId: string) => {
    const breakdowns = costBreakdowns[vehicleId] || [];
    const { data: latestBreakdowns } = await supabase
      .from('vehicle_cost_breakdowns')
      .select('amount')
      .eq('vehicle_id', vehicleId);
    
    const total = (latestBreakdowns || []).reduce((sum, b) => sum + Number(b.amount), 0);
    
    await supabase
      .from('vehicles')
      .update({ cost_price: total })
      .eq('id', vehicleId);

    setVehicles(prev => prev.map(v => 
      v.id === vehicleId ? { ...v, cost_price: total } : v
    ));
  };

  const handleUploadDocument = async (vehicleId: string, file: File) => {
    setUploadingDoc(true);
    try {
      const fileName = `${vehicleId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('vehicle-cost-docs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-cost-docs')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('vehicle_cost_documents')
        .insert({
          vehicle_id: vehicleId,
          file_name: file.name,
          file_url: publicUrl,
          description: null
        })
        .select()
        .single();

      if (error) throw error;

      setCostDocuments(prev => ({
        ...prev,
        [vehicleId]: [data, ...(prev[vehicleId] || [])]
      }));

      toast.success('Document uploaded');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (vehicleId: string, docId: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/vehicle-cost-docs/');
      if (urlParts[1]) {
        await supabase.storage.from('vehicle-cost-docs').remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from('vehicle_cost_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      setCostDocuments(prev => ({
        ...prev,
        [vehicleId]: prev[vehicleId]?.filter(d => d.id !== docId) || []
      }));

      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleSavePrice = async (vehicleId: string) => {
    const priceValue = editingPrices[vehicleId];
    const numericPrice = priceValue ? parseFloat(priceValue) : 0;

    if (isNaN(numericPrice) || numericPrice < 0) {
      toast.error('Please enter a valid list price');
      return;
    }

    setSavingId(vehicleId);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ price: numericPrice })
        .eq('id', vehicleId);

      if (error) throw error;
      
      setVehicles(prev => prev.map(v => 
        v.id === vehicleId ? { ...v, price: numericPrice } : v
      ));
      toast.success('Price updated');
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    } finally {
      setSavingId(null);
    }
  };

  const [deletedVehicles, setDeletedVehicles] = useState<Vehicle[]>([]);

  const handleDelete = async (vehicleId: string) => {
    const vehicleToDelete = vehicles.find(v => v.id === vehicleId);
    if (!vehicleToDelete) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;
      
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      setDeletedVehicles(prev => [vehicleToDelete, ...prev]);
      toast.success('Vehicle deleted - you can restore it from the Recently Deleted section below');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete vehicle');
    }
  };

  const handleRestore = async (vehicle: Vehicle) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .insert([{
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          price: vehicle.price,
          cost_price: vehicle.cost_price,
          status: vehicle.status,
          vin: vehicle.vin || `RESTORED-${vehicle.id.slice(0, 8)}`
        }]);

      if (error) throw error;
      
      setVehicles(prev => [...prev, vehicle].sort((a, b) => b.year - a.year));
      setDeletedVehicles(prev => prev.filter(v => v.id !== vehicle.id));
      toast.success('Vehicle restored');
    } catch (error) {
      console.error('Error restoring vehicle:', error);
      toast.error('Failed to restore vehicle');
    }
  };

  const handlePermanentDelete = (vehicleId: string) => {
    setDeletedVehicles(prev => prev.filter(v => v.id !== vehicleId));
    toast.success('Vehicle permanently removed from deleted list');
  };

  const handlePrint = (vehicleId: string) => {
    setPrintVehicleId(vehicleId);
    setPrintDialogOpen(true);
    fetchCostBreakdowns(vehicleId);
    fetchCostDocuments(vehicleId);
  };

  const executePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const vehicle = vehicles.find(v => v.id === printVehicleId);
    const breakdowns = costBreakdowns[printVehicleId || ''] || [];
    const totalCost = breakdowns.reduce((sum, b) => sum + Number(b.amount), 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Vehicle Cost Report - ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; }
            .total-row { font-weight: bold; background-color: #e8e8e8; }
            .summary { margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 8px; }
            .profit { color: ${(Number(vehicle?.price) || 0) - totalCost >= 0 ? 'green' : 'red'}; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Vehicle Cost Report</h1>
          <p><strong>Vehicle:</strong> ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}</p>
          <p><strong>Status:</strong> ${vehicle?.status}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          
          <h2>Cost Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${breakdowns.map(b => `
                <tr>
                  <td>${b.category}</td>
                  <td>${b.description || '-'}</td>
                  <td style="text-align: right;">$${Number(b.amount).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2">Total Cost</td>
                <td style="text-align: right;">$${totalCost.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="summary">
            <p><strong>List Price:</strong> $${Number(vehicle?.price).toLocaleString()}</p>
            <p><strong>Total Cost:</strong> $${totalCost.toLocaleString()}</p>
            <p class="profit"><strong>Profit/Loss:</strong> $${((Number(vehicle?.price) || 0) - totalCost).toLocaleString()}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Inventory Cost vs Listing Price</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('recently-deleted-section')?.scrollIntoView({ behavior: 'smooth' })}
            className={`${deletedVehicles.length > 0 ? 'text-orange-600 border-orange-300 hover:bg-orange-50' : 'text-muted-foreground'}`}
            disabled={deletedVehicles.length === 0}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Restore ({deletedVehicles.length})
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {vehicles.map((vehicle) => {
            const profit = calculateProfit(Number(vehicle.price), vehicle.cost_price);
            const margin = calculateMargin(Number(vehicle.price), vehicle.cost_price);
            const isExpanded = expandedVehicle === vehicle.id;
            const breakdowns = costBreakdowns[vehicle.id] || [];
            const documents = costDocuments[vehicle.id] || [];
            
            return (
              <Collapsible key={vehicle.id} open={isExpanded} onOpenChange={() => handleExpandVehicle(vehicle.id)}>
                <div className="border rounded-lg">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <span className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                          <span className={`ml-3 px-2 py-1 rounded text-xs ${
                            vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                            vehicle.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {vehicle.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">List Price</div>
                          {isRamon ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editingPrices[vehicle.id] || ''}
                                onChange={(e) => setEditingPrices(prev => ({
                                  ...prev,
                                  [vehicle.id]: e.target.value
                                }))}
                                className="w-28 text-right"
                              />
                              <Button size="sm" onClick={() => handleSavePrice(vehicle.id)} disabled={savingId === vehicle.id}>
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="font-medium">${Number(vehicle.price).toLocaleString()}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Total Cost</div>
                          <div className="font-medium">${Number(vehicle.cost_price || 0).toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Profit</div>
                          <div className={`font-medium ${profit !== null && profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profit !== null ? `$${profit.toLocaleString()}` : '—'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Margin</div>
                          <div className={`font-medium ${margin !== null && margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {margin !== null ? `${margin.toFixed(1)}%` : '—'}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handlePrint(vehicle.id)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        {isRamon && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {vehicle.year} {vehicle.make} {vehicle.model}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t p-4 space-y-4">
                      {/* Cost Breakdown Table */}
                      <div>
                        <h4 className="font-medium mb-2">Cost Breakdown</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Category</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {breakdowns.map((breakdown) => (
                              <TableRow key={breakdown.id}>
                                <TableCell>{breakdown.category}</TableCell>
                                <TableCell>{breakdown.description || '-'}</TableCell>
                                <TableCell className="text-right">${Number(breakdown.amount).toLocaleString()}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteBreakdown(vehicle.id, breakdown.id)}>
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell>
                                <Select value={newBreakdown.category} onValueChange={(v) => setNewBreakdown(prev => ({ ...prev, category: v }))}>
                                  <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {COST_CATEGORIES.map(cat => (
                                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Description (optional)"
                                  value={newBreakdown.description}
                                  onChange={(e) => setNewBreakdown(prev => ({ ...prev, description: e.target.value }))}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="Amount"
                                  value={newBreakdown.amount}
                                  onChange={(e) => setNewBreakdown(prev => ({ ...prev, amount: e.target.value }))}
                                  className="text-right"
                                />
                              </TableCell>
                              <TableCell>
                                <Button size="sm" onClick={() => handleAddBreakdown(vehicle.id)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>

                      {/* Documents Section */}
                      <div>
                        <h4 className="font-medium mb-2">Invoices & Documents</h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                              <FileText className="h-4 w-4" />
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                                {doc.file_name}
                              </a>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteDocument(vehicle.id, doc.id, doc.file_url)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div>
                          <Label htmlFor={`upload-${vehicle.id}`} className="cursor-pointer">
                            <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                              <Upload className="h-4 w-4" />
                              {uploadingDoc ? 'Uploading...' : 'Upload Invoice/Document'}
                            </div>
                          </Label>
                          <input
                            id={`upload-${vehicle.id}`}
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadDocument(vehicle.id, file);
                              e.target.value = '';
                            }}
                            disabled={uploadingDoc}
                          />
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Print Cost Report</DialogTitle>
          </DialogHeader>
          <div ref={printRef} className="p-4">
            {printVehicleId && (() => {
              const vehicle = vehicles.find(v => v.id === printVehicleId);
              const breakdowns = costBreakdowns[printVehicleId] || [];
              const totalCost = breakdowns.reduce((sum, b) => sum + Number(b.amount), 0);
              
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg">{vehicle?.year} {vehicle?.make} {vehicle?.model}</h3>
                    <p className="text-sm text-muted-foreground">Status: {vehicle?.status}</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {breakdowns.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.category}</TableCell>
                          <TableCell>{b.description || '-'}</TableCell>
                          <TableCell className="text-right">${Number(b.amount).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted">
                        <TableCell colSpan={2}>Total Cost</TableCell>
                        <TableCell className="text-right">${totalCost.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-muted-foreground">List Price</div>
                      <div className="font-bold">${Number(vehicle?.price).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                      <div className="font-bold">${totalCost.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Profit/Loss</div>
                      <div className={`font-bold ${(Number(vehicle?.price) || 0) - totalCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${((Number(vehicle?.price) || 0) - totalCost).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
            <Button onClick={executePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recently Deleted Section */}
      {deletedVehicles.length > 0 && (
        <Card id="recently-deleted-section" className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Undo2 className="h-5 w-5" />
              Recently Deleted ({deletedVehicles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">List Price</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(vehicle.price).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(vehicle.cost_price || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(vehicle)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Undo2 className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePermanentDelete(vehicle.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-sm text-orange-600 mt-3">
              These vehicles can be restored until you refresh the page or close the browser.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
