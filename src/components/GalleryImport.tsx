import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const GalleryImport = () => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      // Map rows to gallery records
      const galleries = rows.map((row) => {
        // Try common column name patterns
        const name = row["Gallery Name"] || row["Name"] || row["gallery_name"] || "";
        const country = row["Country"] || row["country"] || null;
        const city = row["City"] || row["city"] || null;
        const yearRaw = row["Establishe Year"] || row["Established Year"] || row["Year"] || row["established_year"] || null;
        const established_year = yearRaw ? parseInt(String(yearRaw)) : null;

        return { name, country, city, established_year, website: null };
      }).filter((g) => g.name);

      if (galleries.length === 0) {
        toast.error("No galleries found in the file");
        setImporting(false);
        return;
      }

      // Send to edge function in batches
      const batchSize = 500;
      let totalInserted = 0;

      for (let i = 0; i < galleries.length; i += batchSize) {
        const batch = galleries.slice(i, i + batchSize);
        const { data: result, error } = await supabase.functions.invoke("import-galleries", {
          body: { galleries: batch },
        });

        if (error) {
          toast.error(`Import failed at batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          setImporting(false);
          return;
        }
        totalInserted += result?.inserted || batch.length;
      }

      setResult({ inserted: totalInserted });
      toast.success(`Successfully imported ${totalInserted} galleries`);
    } catch (err: any) {
      toast.error(`Failed to parse file: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 border border-border rounded-sm space-y-3">
      <h3 className="text-sm font-medium">Import Galleries Database</h3>
      <p className="text-xs text-muted-foreground">
        Upload an Excel file (.xlsx) with columns: Gallery Name, Country, City, Established Year
      </p>

      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            disabled={importing}
          />
          <Button variant="outline" size="sm" asChild disabled={importing}>
            <span className="gap-2">
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {importing ? "Importing…" : "Upload XLSX"}
            </span>
          </Button>
        </label>

        {result && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Check className="w-4 h-4 text-green-600" />
            {result.inserted} galleries imported
          </span>
        )}
      </div>
    </div>
  );
};

export default GalleryImport;
