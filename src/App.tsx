import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./app/providers/app-providers";
import { AppRoutes } from "./app/routes/app-routes";
import { WhatsAppFloatingButton } from "@/components/shared/WhatsAppFloatingButton";
import { FeedbackFloatingButton } from "@/components/shared/FeedbackFloatingButton";

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <AppRoutes />
      <WhatsAppFloatingButton />
      <FeedbackFloatingButton />
    </BrowserRouter>
  </AppProviders>
);

export default App;
