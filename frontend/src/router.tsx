import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import App from "@/pages/App";
import Introduction from "@/pages/Introduction";
import Methodology from "@/pages/Methodology";
import Implementation from "@/pages/Implementation";
import Experiments from "@/pages/Experiments";
import Benchmark from "@/pages/Benchmark";
import NotFound from "@/pages/NotFound";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Enter and land directly on the workbench. */}
          <Route path="/" element={<App />} />
          <Route path="/introduction" element={<Introduction />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/implementation" element={<Implementation />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/benchmark" element={<Benchmark />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
