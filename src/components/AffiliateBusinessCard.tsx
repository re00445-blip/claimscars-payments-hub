import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Share2, Pencil, CreditCard } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/cars-claims-logo-new.jpg";

interface AffiliateBusinessCardProps {
  affiliateName: string;
  referralCode: string;
  email?: string;
  phone?: string;
}

export const AffiliateBusinessCard = ({
  affiliateName,
  referralCode,
  email,
  phone,
}: AffiliateBusinessCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [customTitle, setCustomTitle] = useState("Marketing Affiliate");
  const [customName, setCustomName] = useState(affiliateName);

  const referralUrl = `${window.location.origin}/claims?ref=${referralCode}`;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Business Card - ${customName}</title>
            <style>
              @page {
                size: 3.5in 2in;
                margin: 0;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #f5f5f5;
                font-family: Georgia, 'Times New Roman', serif;
              }
              .card {
                width: 3.5in;
                height: 2in;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
                border-radius: 12px;
                padding: 14px 16px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                color: #d4af37;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
              }
              .card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(ellipse at top right, rgba(212, 175, 55, 0.1) 0%, transparent 50%);
                pointer-events: none;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                position: relative;
                z-index: 1;
              }
              .name-section h2 {
                font-size: 18px;
                font-weight: 600;
                margin: 0 0 2px 0;
                color: #d4af37;
                letter-spacing: 0.5px;
              }
              .name-section p {
                font-size: 11px;
                margin: 0;
                color: #a08830;
                font-style: italic;
              }
              .qr-container {
                background: white;
                padding: 4px;
                border-radius: 4px;
              }
              .qr-container svg {
                display: block;
              }
              .contact-info {
                position: relative;
                z-index: 1;
              }
              .contact-info p {
                font-size: 9px;
                margin: 2px 0;
                color: #b8a040;
              }
              .footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                position: relative;
                z-index: 1;
              }
              .tagline {
                font-size: 7px;
                color: #666;
                font-style: italic;
              }
              .logo-container {
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .brand-text {
                font-size: 10px;
                font-weight: bold;
                color: #d4af37;
                letter-spacing: 1px;
              }
              .print-instructions {
                margin-top: 30px;
                text-align: center;
                font-family: Arial, sans-serif;
                color: #666;
                font-size: 12px;
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                }
                .print-instructions {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div>
              <div class="card">
                <div class="header">
                  <div class="name-section">
                    <h2>${customName}</h2>
                    <p>${customTitle}</p>
                  </div>
                  <div class="qr-container">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 58 58" width="50" height="50">
                      ${document.querySelector('#business-card-qr svg')?.innerHTML || ''}
                    </svg>
                  </div>
                </div>
                <div class="contact-info">
                  ${phone ? `<p>📞 ${phone}</p>` : ''}
                  ${email ? `<p>✉️ ${email}</p>` : ''}
                </div>
                <div class="footer">
                  <div class="logo-container">
                    <div class="brand-text">CARS & CLAIMS</div>
                  </div>
                  <p class="tagline">Car Sales, Car Accident Referrals, Marketing & Financing</p>
                </div>
              </div>
              <div class="print-instructions">
                <p>Print this page and send to your preferred printing facility.</p>
                <p>Recommended: Standard business card size (3.5" x 2")</p>
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() { window.print(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${customName} - Cars & Claims`,
          text: `Contact ${customName} at Cars & Claims for car sales, accident referrals, and financing.`,
          url: referralUrl,
        });
      } catch (error) {
        navigator.clipboard.writeText(referralUrl);
        toast.success("Link copied to clipboard!");
      }
    } else {
      navigator.clipboard.writeText(referralUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4">
      {/* Editing Controls */}
      {isEditing ? (
        <div className="bg-card p-4 rounded-lg border space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cardName">Name on Card</Label>
            <Input
              id="cardName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardTitle">Title</Label>
            <Input
              id="cardTitle"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Your title"
            />
          </div>
          <Button onClick={() => setIsEditing(false)} size="sm">
            Done Editing
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="gap-2"
        >
          <Pencil className="h-4 w-4" />
          Customize Card
        </Button>
      )}

      {/* Business Card Preview */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[3.5in] aspect-[1.75] rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at top right, rgba(212, 175, 55, 0.1) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 h-full p-4 flex flex-col justify-between">
          {/* Header with name and QR */}
          <div className="flex justify-between items-start">
            <div>
              <h2
                className="text-lg font-semibold tracking-wide"
                style={{ color: "#d4af37", fontFamily: "Georgia, serif" }}
              >
                {customName}
              </h2>
              <p
                className="text-xs italic"
                style={{ color: "#a08830", fontFamily: "Georgia, serif" }}
              >
                {customTitle}
              </p>
            </div>
            <div id="business-card-qr" className="bg-white p-1 rounded">
              <QRCodeSVG
                value={referralUrl}
                size={50}
                level="M"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-0.5">
            {phone && (
              <p className="text-[10px]" style={{ color: "#b8a040" }}>
                📞 {phone}
              </p>
            )}
            {email && (
              <p className="text-[10px]" style={{ color: "#b8a040" }}>
                ✉️ {email}
              </p>
            )}
          </div>

          {/* Footer with logo and tagline */}
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="Cars & Claims"
                className="w-8 h-8 object-contain rounded"
              />
              <span
                className="text-[10px] font-bold tracking-wider"
                style={{ color: "#d4af37" }}
              >
                CARS & CLAIMS
              </span>
            </div>
            <p className="text-[7px] italic text-gray-500">
              Car Sales, Car Accident Referrals, Marketing & Financing
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          Print for Facility
        </Button>
        <Button onClick={handleShare} variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Click "Print for Facility" to generate a print-ready version you can send to your printing service.
      </p>
    </div>
  );
};
