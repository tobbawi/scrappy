import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Companies } from "@/pages/Companies";
import { Cases } from "@/pages/Cases";
import { CaseDetail } from "@/pages/CaseDetail";
import { Digest } from "@/pages/Digest";
import { Settings } from "@/pages/Settings";
import { JobDetail } from "@/pages/JobDetail";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/digest" element={<Digest />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
      </Route>
    </Routes>
  );
}
