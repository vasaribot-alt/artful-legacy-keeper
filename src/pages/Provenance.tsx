import { AppLayout } from "@/components/AppLayout";

const Provenance = () => {
  return (
    <AppLayout title="Provenance">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Provenance tracking coming soon.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Document ownership history and chain of custody for your artworks.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Provenance;
