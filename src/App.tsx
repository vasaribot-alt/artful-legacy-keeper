import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ArtworkDetail from "./pages/ArtworkDetail";
import ArtworkView from "./pages/ArtworkView";
import ArtistProfile from "./pages/ArtistProfile";
import ArtistProfileView from "./pages/ArtistProfileView";
import ArtistCvView from "./pages/ArtistCvView";
import CvEdit from "./pages/CvEdit";
import ArtworksGalleryView from "./pages/ArtworksGalleryView";
import Exhibitions from "./pages/Exhibitions";
import Provenance from "./pages/Provenance";
import Series from "./pages/Series";
import Portfolios from "./pages/Portfolios";
import PortfolioDetail from "./pages/PortfolioDetail";
import PortfolioShared from "./pages/PortfolioShared";
import Catalogues from "./pages/Catalogues";
import FoundingArtists from "./pages/FoundingArtists";
import FoundationDashboard from "./pages/FoundationDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ArtistProfile />} />
          <Route path="/profile/view" element={<ArtistProfileView />} />
          <Route path="/profile/cv/view" element={<ArtistCvView />} />
          <Route path="/cv" element={<CvEdit />} />
          <Route path="/dashboard/view" element={<ArtworksGalleryView />} />
          <Route path="/artwork/:id" element={<ArtworkDetail />} />
          <Route path="/artwork/:id/view" element={<ArtworkView />} />
          <Route path="/exhibitions" element={<Exhibitions />} />
          <Route path="/provenance" element={<Provenance />} />
          <Route path="/catalogues" element={<Catalogues />} />
          <Route path="/series" element={<Series />} />
          <Route path="/portfolios" element={<Portfolios />} />
          <Route path="/portfolio/:id" element={<PortfolioDetail />} />
          <Route path="/portfolio/shared/:token" element={<PortfolioShared />} />
          <Route path="/founding-artists" element={<FoundingArtists />} />
          <Route path="/foundation" element={<FoundationDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
