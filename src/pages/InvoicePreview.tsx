import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download } from "lucide-react";
import html2pdf from "html2pdf.js";

interface LineItem {
  id: string;
  type: "parts" | "labor";
  description: string;
  customDescription: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  vehicle_info: string | null;
  line_items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  status: string;
  created_at: string;
}

const InvoicePreview = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) {
        setError("Invoice ID not provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await (supabase
          .from("invoices" as any) as any)
          .select("*")
          .eq("id", invoiceId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Invoice not found");

        setInvoice(data);
      } catch (err: any) {
        console.error("Error fetching invoice:", err);
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  const getItemDescription = (item: LineItem) => {
    if (item.description === "Custom Entry" && item.customDescription) {
      return item.customDescription;
    }
    return item.description;
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !invoice) return;
    
    setDownloading(true);
    try {
      const element = invoiceRef.current;
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `invoice-${invoice.customer_name.replace(/\s+/g, '-').toLowerCase()}-${new Date(invoice.created_at).toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground">{error || "The requested invoice could not be found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const partsItems = invoice.line_items.filter((item) => item.type === "parts");
  const laborItems = invoice.line_items.filter((item) => item.type === "labor");

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Download Button */}
        <div className="mb-4 flex justify-end">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="bg-primary hover:bg-primary/90"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>

        {/* Status Badge */}
        {invoice.status === "draft" && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-center print:hidden">
            <span className="text-yellow-800 font-medium">📝 Draft Invoice - Preview Only</span>
          </div>
        )}

        {/* Invoice Content */}
        <div ref={invoiceRef} className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Quality Foreign Domestic Autos</h1>
            <p className="text-gray-600">Invoice</p>
            <p className="text-sm text-gray-500 mt-2">
              Date: {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Customer Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
            <p className="font-medium">{invoice.customer_name}</p>
            <p className="text-gray-600">{invoice.customer_email}</p>
            {invoice.customer_phone && (
              <p className="text-gray-600">{invoice.customer_phone}</p>
            )}
            {invoice.vehicle_info && (
              <p className="text-gray-600 mt-2">
                <span className="font-medium">Vehicle:</span> {invoice.vehicle_info}
              </p>
            )}
          </div>

          {/* Parts Section */}
          {partsItems.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 border-b pb-2 mb-3">Parts</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {partsItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2">{getItemDescription(item)}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="py-2 text-right">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Labor Section */}
          {laborItems.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 border-b pb-2 mb-3">Labor</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-center">Hours</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {laborItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2">{getItemDescription(item)}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="py-2 text-right">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax (7%):</span>
                <span>${invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span className="text-green-600">${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-4 bg-gray-50 rounded-lg mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Notes:</h4>
              <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-6 border-t">
            <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg mb-4">
              <h3 className="text-green-600 font-semibold mb-2">Thank You for Your Business!</h3>
              <p className="text-sm text-gray-600">
                We truly appreciate your trust in Quality Foreign Domestic Autos.
              </p>
            </div>
            <p className="text-gray-500 text-sm">Quality Foreign Domestic Autos</p>
            <p className="text-gray-400 text-sm">470-519-6717 | ramon@carsandclaims.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;
