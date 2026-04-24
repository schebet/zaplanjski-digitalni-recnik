import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupPWA } from "./pwa";
import { startVersionCheck } from "./lib/versionCheck";

createRoot(document.getElementById("root")!).render(<App />);

setupPWA();
startVersionCheck();

