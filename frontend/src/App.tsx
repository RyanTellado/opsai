import { useEffect, useState } from "react";
import Login from "./pages/Login";
import AppShell from "./pages/AppShell";
import { getBriefingBundle, getBusinessReports, listBusinesses } from "./lib/api";
import { isLoggedIn, logout } from "./lib/auth";
import type { BriefingBundle, BusinessWithMeta, ReportSummary } from "./types";

export default function App() {
  const [stage, setStage] = useState<"auth" | "app">(() =>
    isLoggedIn() ? "app" : "auth"
  );
  const [businesses, setBusinesses] = useState<BusinessWithMeta[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<BusinessWithMeta | null>(null);
  const [activeBundle, setActiveBundle] = useState<BriefingBundle | null>(null);
  const [businessReports, setBusinessReports] = useState<ReportSummary[]>([]);

  // Load businesses on mount (if already logged in) or after login
  useEffect(() => {
    if (stage === "app") loadBusinesses();
  }, [stage]);

  async function loadBusinesses() {
    try {
      const list = await listBusinesses();
      setBusinesses(list);
      if (list.length > 0) {
        await selectBusiness(list[0]);
      }
    } catch {
      // token expired — bounce to login
      handleLogout();
    }
  }

  async function selectBusiness(biz: BusinessWithMeta) {
    setActiveBusiness(biz);
    setActiveBundle(null);
    setBusinessReports([]);
    if (biz.report_count === 0) return;
    try {
      const reports = await getBusinessReports(biz.id);
      setBusinessReports(reports);
      if (reports.length > 0) {
        const bundle = await getBriefingBundle(reports[0].briefing_id);
        setActiveBundle(bundle);
      }
    } catch {
      // non-fatal — briefing section handles missing bundle
    }
  }

  function handleLogin() {
    setStage("app");
  }

  function handleLogout() {
    logout();
    setBusinesses([]);
    setActiveBusiness(null);
    setActiveBundle(null);
    setBusinessReports([]);
    setStage("auth");
  }

  function handleBusinessCreated(biz: BusinessWithMeta) {
    setBusinesses((prev) => [biz, ...prev]);
    setActiveBusiness(biz);
    setActiveBundle(null);
    setBusinessReports([]);
  }

  function handleBusinessSelected(biz: BusinessWithMeta) {
    selectBusiness(biz);
  }

  function handleBriefingGenerated(bundle: BriefingBundle, reports: ReportSummary[]) {
    setActiveBundle(bundle);
    setBusinessReports(reports);
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === activeBusiness?.id
          ? {
              ...b,
              report_count: reports.length,
              last_briefing_at: bundle.generated_at,
              latest_headline: bundle.briefing.headline,
            }
          : b
      )
    );
  }

  function handleReportSelected(bundle: BriefingBundle) {
    setActiveBundle(bundle);
  }

  if (stage === "auth") {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <AppShell
      businesses={businesses}
      activeBusiness={activeBusiness}
      activeBundle={activeBundle}
      businessReports={businessReports}
      onLogout={handleLogout}
      onBusinessCreated={handleBusinessCreated}
      onBusinessSelected={handleBusinessSelected}
      onBriefingGenerated={handleBriefingGenerated}
      onReportSelected={handleReportSelected}
    />
  );
}
