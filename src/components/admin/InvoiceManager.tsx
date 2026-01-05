import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceGenerator } from "./InvoiceGenerator";
import { InvoiceHistory } from "./InvoiceHistory";
import { FilePlus, History } from "lucide-react";

export const InvoiceManager = () => {
  return (
    <Tabs defaultValue="create" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="create" className="flex items-center gap-2">
          <FilePlus className="h-4 w-4" />
          Create Invoice
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Invoice History
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="create">
        <InvoiceGenerator />
      </TabsContent>
      
      <TabsContent value="history">
        <InvoiceHistory />
      </TabsContent>
    </Tabs>
  );
};
