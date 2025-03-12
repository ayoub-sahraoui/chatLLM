import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import "./index.css";
import RootLayout from "./root-layout";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <RootLayout />
    </HashRouter>
  </StrictMode>
);
