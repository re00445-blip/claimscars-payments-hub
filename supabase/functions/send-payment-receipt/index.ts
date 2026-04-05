import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentReceiptRequest {
  paymentId: string;
  customerName: string;
  customerEmail: string;
  vehicleInfo: string;
  paymentDate: string;
  invoiceNumber: string;
  principalPaid: number;
  interestPaid: number;
  lateFeePaid: number;
  totalAmount: number;
  paymentMethod: string;
  remainingBalance: number;
  notes?: string;
}

const generateReceiptHTML = (data: PaymentReceiptRequest) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Receipt - Invoice #${data.invoiceNumber}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px; color: #22c55e;">Quality Foreign Domestic Autos</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #9ca3af;">Professional Auto Sales & Service</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #22c55e; margin: 0;">PAYMENT RECEIPT</h2>
          <p style="color: #666; margin: 5px 0;">Invoice #${data.invoiceNumber}</p>
          <p style="color: #666; margin: 5px 0;">Date: ${data.paymentDate}</p>
        </div>
        
        <hr style="border: none; border-top: 2px solid #22c55e; margin: 20px 0;">
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Customer Information</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${data.customerName}</p>
          <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${data.vehicleInfo}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Service Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Principal Payment</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${data.principalPaid.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Interest Payment</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${data.interestPaid.toFixed(2)}</td>
            </tr>
            ${data.lateFeePaid > 0 ? `
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Late Fee</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${data.lateFeePaid.toFixed(2)}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <table style="width: 100%;">
            <tr>
              <td style="font-size: 18px; font-weight: bold;">TOTAL PAID</td>
              <td style="font-size: 24px; font-weight: bold; text-align: right;">$${data.totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
          <p style="margin: 5px 0;"><strong>Remaining Balance:</strong> $${data.remainingBalance.toFixed(2)}</p>
        </div>
        
        ${data.notes ? `
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px;"><strong>Notes:</strong> ${data.notes}</p>
        </div>
        ` : ''}
        
        <hr style="border: none; border-top: 1px dashed #ccc; margin: 25px 0;">
        
        <div style="text-align: center; color: #666;">
          <h3 style="color: #22c55e; margin-bottom: 10px;">Thank You for Your Business!</h3>
          <p style="margin: 5px 0; font-size: 14px;">We appreciate your trust in Quality Foreign Domestic Autos.</p>
          <p style="margin: 15px 0 5px 0; font-size: 12px;"><strong>Contact:</strong> 470-519-6717</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Email:</strong> ramon@carsandclaims.com</p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 15px; color: #999; font-size: 11px;">
        <p>This is an official receipt from Quality Foreign Domestic Autos.</p>
        <p>Please keep this for your records.</p>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PaymentReceiptRequest = await req.json();
    
    console.log("Sending payment receipt:", { invoiceNumber: data.invoiceNumber, customerEmail: data.customerEmail });
    
    const receiptHTML = generateReceiptHTML(data);
    
    // Send to customer
    if (data.customerEmail) {
      const customerResponse = await resend.emails.send({
        from: "Quality Foreign Domestic Autos <noreply@carsandclaims.com>",
        to: [data.customerEmail],
        subject: `Payment Receipt - Invoice #${data.invoiceNumber}`,
        html: receiptHTML,
      });
      console.log("Customer email sent:", customerResponse);
    }
    
    // Send copy to admin
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "ramon@carsandclaims.com";
    const adminResponse = await resend.emails.send({
      from: "Quality Foreign Domestic Autos <noreply@carsandclaims.com>",
      to: [adminEmail],
      subject: `Payment Received - ${data.customerName} - Invoice #${data.invoiceNumber}`,
      html: receiptHTML,
    });
    console.log("Admin email sent:", adminResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending payment receipt:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
