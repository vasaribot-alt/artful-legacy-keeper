import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ArtworkDetail from "./pages/ArtworkDetail";
import ArtworkView from "./pages/ArtworkView";
import ArtistProfile from "./pages/ArtistProfile";
import ArtistProfileView from "./pages/ArtistProfileView";
import ArtistCvView from "./pages/ArtistCvView";
import CvEdit from "./pages/CvEdit";
import ArtworksGalleryView from "./pages/ArtworksGalleryView";
import Exhibitions from "./pages/Exhibitions";
import ExhibitionsView from "./pages/ExhibitionsView";
import Provenance from "./pages/Provenance";
import Series from "./pages/Series";
import Portfolios from "./pages/Portfolios";
import PortfolioDetail from "./pages/PortfolioDetail";
import PortfolioShared from "./pages/PortfolioShared";
import Catalogues from "./pages/Catalogues";
import FoundingArtists from "./pages/FoundingArtists";
import PublicArtistProfile from "./pages/PublicArtistProfile";
import FoundationDashboard from "./pages/FoundationDashboard";
import Donors from "./pages/Donors";
import RegistrarDashboard from "./pages/RegistrarDashboard";
import RegistrarClientView from "./pages/RegistrarClientView";
import Inventory from "./pages/Inventory";
import Files from "./pages/Files";
import StorageTiers from "./pages/StorageTiers";
import Donate from "./pages/Donate";
import DonateThanks from "./pages/DonateThanks";
import CollectorAccess from "./pages/CollectorAccess";
import Capture from "./pages/Capture";
import CrSubmit from "./pages/CrSubmit";
import CrStatus from "./pages/CrStatus";
import CrDirectory from "./pages/CrDirectory";
import CrArtistProfile from "./pages/CrArtistProfile";
import CrProfileEditor from "./pages/CrProfileEditor";
import InviteFriends from "./pages/InviteFriends";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ArtistProfile />} />
          <Route path="/profile/view" element={<ArtistProfileView />} />
          <Route path="/profile/cv/view" element={<ArtistCvView />} />
          <Route path="/cv" element={<CvEdit />} />
          <Route path="/dashboard/view" element={<ArtworksGalleryView />} />
          <Route path="/artwork/:id" element={<ArtworkDetail />} />
          <Route path="/artwork/:id/view" element={<ArtworkView />} />
          <Route path="/exhibitions" element={<Exhibitions />} />
          <Route path="/exhibitions/view" element={<ExhibitionsView />} />
          <Route path="/provenance" element={<Provenance />} />
          <Route path="/catalogues" element={<Catalogues />} />
          <Route path="/series" element={<Series />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/files" element={<Files />} />
          <Route path="/storage-tiers" element={<StorageTiers />} />
          <Route path="/portfolios" element={<Portfolios />} />
          <Route path="/portfolio/:id" element={<PortfolioDetail />} />
          <Route path="/portfolio/shared/:token" element={<PortfolioShared />} />
          <Route path="/founding-artists" element={<FoundingArtists />} />
          <Route path="/artist/:id" element={<PublicArtistProfile />} />
          <Route path="/foundation" element={<FoundationDashboard />} />
          <Route path="/donors" element={<Donors />} />
          <Route path="/registrar" element={<RegistrarDashboard />} />
          <Route path="/registrar/client/:ownerId/*" element={<RegistrarClientView />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/donate/thanks" element={<DonateThanks />} />
          <Route path="/collector-access" element={<CollectorAccess />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/cr/submit/:artistId" element={<CrSubmit />} />
          <Route path="/cr/status/:token" element={<CrStatus />} />
          <Route path="/cr" element={<CrDirectory />} />
          <Route path="/cr/artist/:gar" element={<CrArtistProfile />} />
          <Route path="/cr/profile" element={<CrProfileEditor />} />
          <Route path="/invite-friends" element={<InviteFriends />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
