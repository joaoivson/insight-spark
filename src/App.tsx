import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./app/providers/app-providers";
import { AppRoutes } from "./app/routes/app-routes";
import { PageViewBeacon } from "@/features/admin/components/PageViewBeacon";
import { AccessBeacon } from "@/features/admin/components/AccessBeacon";

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <AccessBeacon />
      <PageViewBeacon />
      <AppRoutes />
    </BrowserRouter>
  </AppProviders>
);

export default App;
