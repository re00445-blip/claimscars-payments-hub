import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";

type PaymentType = 'apple_pay' | 'visa' | 'delta' | 'mastercard' | 'wellsfargo' | 'boa';

interface Subscription {
  id: string;
  name: string;
  cost: number;
  due_date: string;
  payment_type: PaymentType;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'visa', label: 'Visa' },
  { value: 'delta', label: 'Delta' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'wellsfargo', label: 'Wells Fargo' },
  { value: 'boa', label: 'Bank of America' },
];

const SubscriptionsManager = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    due_date: '',
    payment_type: 'visa' as PaymentType,
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      toast.error('Failed to load subscriptions');
      console.error(error);
    } else {
      setSubscriptions((data || []) as Subscription[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cost: '',
      due_date: '',
      payment_type: 'visa',
      notes: '',
      is_active: true,
    });
    setEditingId(null);
  };

  const handleOpenDialog = (subscription?: Subscription) => {
    if (subscription) {
      setEditingId(subscription.id);
      setFormData({
        name: subscription.name,
        cost: subscription.cost.toString(),
        due_date: subscription.due_date,
        payment_type: subscription.payment_type,
        notes: subscription.notes || '',
        is_active: subscription.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      cost: parseFloat(formData.cost),
      due_date: formData.due_date,
      payment_type: formData.payment_type,
      notes: formData.notes || null,
      is_active: formData.is_active,
    };

    if (editingId) {
      const { error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        toast.error('Failed to update subscription');
        console.error(error);
      } else {
        toast.success('Subscription updated');
        fetchSubscriptions();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('subscriptions')
        .insert(payload);

      if (error) {
        toast.error('Failed to add subscription');
        console.error(error);
      } else {
        toast.success('Subscription added');
        fetchSubscriptions();
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete subscription');
      console.error(error);
    } else {
      toast.success('Subscription deleted');
      fetchSubscriptions();
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      setSubscriptions(prev =>
        prev.map(s => (s.id === id ? { ...s, is_active: !currentStatus } : s))
      );
    }
  };

  const getPaymentLabel = (type: PaymentType) => {
    return PAYMENT_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
  };

  const totalMonthlyCost = subscriptions
    .filter(s => s.is_active)
    .reduce((sum, s) => sum + Number(s.cost), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscriptions
          </CardTitle>
          <CardDescription>
            Manage recurring subscriptions • Active Total: ${totalMonthlyCost.toFixed(2)}/cycle
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Subscription
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Subscription' : 'Add Subscription'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Netflix, Spotify, etc."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="9.99"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_type">Payment Type</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value: PaymentType) => setFormData({ ...formData, payment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={2}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? 'Update' : 'Add'} Subscription
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No subscriptions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id} className={!sub.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{sub.name}</TableCell>
                  <TableCell>${Number(sub.cost).toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(sub.due_date + 'T00:00:00'), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{getPaymentLabel(sub.payment_type)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={sub.is_active}
                      onCheckedChange={() => toggleActive(sub.id, sub.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(sub)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionsManager;
