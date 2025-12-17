import { useEffect } from "react";
import logo from "@/assets/cars-claims-logo-new.jpg";

const PrintReceipts = () => {
  const customerName = "Aneesah Parker";
  const paymentAmount = 250;
  const principalPaid = 200;
  const interestPaid = 50;
  
  // Generate last 4 months receipts
  const receipts = [
    { date: "August 15, 2024", invoiceNum: "INV-20240815-00001", balanceAfter: 2100 },
    { date: "September 15, 2024", invoiceNum: "INV-20240915-00002", balanceAfter: 1900 },
    { date: "October 15, 2024", invoiceNum: "INV-20241015-00003", balanceAfter: 1700 },
    { date: "November 15, 2024", invoiceNum: "INV-20241115-00004", balanceAfter: 1500 },
  ];

  // Current balance after all payments
  const currentBalance = 1350;

  useEffect(() => {
    // Auto-trigger print dialog
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  return (
    <div className="bg-white text-black min-h-screen p-8 print:p-4">
      <style>
        {`
          @media print {
            body { background: white !important; }
            .page-break { page-break-after: always; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* Print instructions */}
      <div className="no-print mb-8 p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p className="text-yellow-800 font-medium">
          The print dialog should open automatically. Select "Save as PDF" to download the receipts.
        </p>
        <button 
          onClick={() => window.print()} 
          className="mt-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Print / Save as PDF
        </button>
      </div>

      {receipts.map((receipt, index) => (
        <div key={receipt.invoiceNum} className={index < receipts.length - 1 ? "page-break" : ""}>
          <div className="max-w-2xl mx-auto border border-gray-300 p-8 mb-8 print:mb-0 print:border-0">
            {/* Header with Logo */}
            <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
              <img src={logo} alt="Company Logo" className="h-20 mx-auto mb-2" />
              <h1 className="text-2xl font-bold text-gray-900">Quality Foreign and Domestic Auto's</h1>
              <p className="text-sm text-gray-600">Cars & Claims</p>
              <p className="text-sm text-gray-600">Phone: 470-519-6717</p>
            </div>

            {/* Receipt Title */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">PAYMENT RECEIPT</h2>
              <p className="text-gray-600">Invoice #: {receipt.invoiceNum}</p>
              <p className="text-gray-600">Date: {receipt.date}</p>
            </div>

            {/* Customer Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
              <p className="text-gray-900 font-medium">{customerName}</p>
            </div>

            {/* Payment Details */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">Payment Details</h3>
              <table className="w-full">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Payment Method:</td>
                    <td className="py-2 text-right font-medium">Cash/Check</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Principal Paid:</td>
                    <td className="py-2 text-right font-medium">${principalPaid.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Interest Paid:</td>
                    <td className="py-2 text-right font-medium">${interestPaid.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b-2 border-gray-800">
                    <td className="py-3 text-gray-900 font-bold">Total Payment:</td>
                    <td className="py-3 text-right font-bold text-lg">${paymentAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Balance Info */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Balance After This Payment:</span>
                <span className="text-xl font-bold text-green-700">${receipt.balanceAfter.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 border-t pt-4">
              <p className="font-medium">Thank you for your payment!</p>
              <p>Quality Foreign and Domestic Auto's - Cars & Claims</p>
              <p>Your trusted partner in automotive financing</p>
            </div>
          </div>
        </div>
      ))}

      {/* Summary Page */}
      <div className="page-break"></div>
      <div className="max-w-2xl mx-auto border border-gray-300 p-8 print:border-0">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <img src={logo} alt="Company Logo" className="h-20 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">Quality Foreign and Domestic Auto's</h1>
          <p className="text-sm text-gray-600">Cars & Claims</p>
          <p className="text-sm text-gray-600">Phone: 470-519-6717</p>
        </div>

        {/* Account Summary Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">ACCOUNT SUMMARY</h2>
          <p className="text-gray-600">As of December 17, 2024</p>
        </div>

        {/* Customer Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-gray-700 mb-2">Customer:</h3>
          <p className="text-gray-900 font-medium">{customerName}</p>
        </div>

        {/* Payment History */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">Payment History (Last 4 Months)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="py-2 text-left text-gray-600">Date</th>
                <th className="py-2 text-right text-gray-600">Principal</th>
                <th className="py-2 text-right text-gray-600">Interest</th>
                <th className="py-2 text-right text-gray-600">Total</th>
                <th className="py-2 text-right text-gray-600">Balance</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.invoiceNum} className="border-b">
                  <td className="py-2">{receipt.date}</td>
                  <td className="py-2 text-right">${principalPaid.toFixed(2)}</td>
                  <td className="py-2 text-right">${interestPaid.toFixed(2)}</td>
                  <td className="py-2 text-right font-medium">${paymentAmount.toFixed(2)}</td>
                  <td className="py-2 text-right">${receipt.balanceAfter.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-800 font-bold">
                <td className="py-3">Total Paid</td>
                <td className="py-3 text-right">${(principalPaid * 4).toFixed(2)}</td>
                <td className="py-3 text-right">${(interestPaid * 4).toFixed(2)}</td>
                <td className="py-3 text-right">${(paymentAmount * 4).toFixed(2)}</td>
                <td className="py-3 text-right"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Current Balance */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-bold text-lg">Current Balance Due:</span>
            <span className="text-2xl font-bold text-blue-700">${currentBalance.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 border-t pt-4">
          <p className="font-medium">Thank you for choosing Quality Foreign and Domestic Auto's!</p>
          <p>We appreciate your continued business.</p>
          <p className="mt-2">Questions? Call us at 470-519-6717</p>
        </div>
      </div>
    </div>
  );
};

export default PrintReceipts;
