import { AppLayout } from "@/components/AppLayout";

const Exhibitions = () => {
  return (
    <AppLayout title="Exhibitions">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Exhibition management coming soon.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Track your exhibitions, link artworks, and manage show history.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Exhibitions;
