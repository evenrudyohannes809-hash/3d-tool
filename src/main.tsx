import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { ThemeProvider } from "./lib/theme";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CalculatorPage from "./pages/CalculatorPage";
import ToolPlaceholder from "./pages/ToolPlaceholder";
import NotFound from "./pages/NotFound";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="tool/calculator" element={<CalculatorPage />} />
            <Route path="tool/:slug" element={<ToolPlaceholder />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
