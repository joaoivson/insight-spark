import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./app/providers/app-providers";
import { AppRoutes } from "./app/routes/app-routes";
import { FeedbackFloatingButton } from "@/components/shared/FeedbackFloatingButton";

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <AppRoutes />
      <FeedbackFloatingButton />
    </BrowserRouter>
  </AppProviders>
);

export default App;
