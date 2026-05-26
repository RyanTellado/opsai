import { useState } from "react";
import Login from "./pages/Login";
import Upload from "./pages/Upload";
import Brief from "./pages/Brief";
import { createBriefing } from "./lib/api";
import { getUser, isLoggedIn, logout } from "./lib/auth";
import type { BriefingBundle, DatasetResponse } from "./types";

type Stage = "auth" | "upload" | "brief";

export default function App() {
  const [stage, setStage] = useState<Stage>(() => (isLoggedIn() ? "upload" : "auth"));
  const [userName, setUserName] = useState<string>(() => getUser()?.name ?? "");
  const [dataset, setDataset] = useState<DatasetResponse | null>(null);
  const [bundle, setBundle] = useState<BriefingBundle | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  function handleLogin(name: string) {
    setUserName(name);
    setStage("upload");
  }

  function handleLogout() {
    logout();
    setUserName("");
    setDataset(null);
    setBundle(null);
    setStage("auth");
  }

  async function handleGenerateBriefing() {
    if (!dataset) return;
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      const b = await createBriefing(dataset.dataset_id);
      setBundle(b);
      setStage("brief");
    } catch (e) {
      setBriefingError(e instanceof Error ? e.message : String(e));
    } finally {
      setBriefingLoading(false);
    }
  }

  function handleBack() {
    setStage("upload");
  }

  if (stage === "auth") {
    return <Login onLogin={handleLogin} />;
  }

  if (stage === "brief" && bundle) {
    return <Brief bundle={bundle} onBack={handleBack} userName={userName} onLogout={handleLogout} />;
  }

  return (
    <Upload
      dataset={dataset}
      onUploaded={(d) => {
        setDataset(d);
        setBundle(null);
        setBriefingError(null);
      }}
      onGenerateBriefing={handleGenerateBriefing}
      briefingLoading={briefingLoading}
      briefingError={briefingError}
      userName={userName}
      onLogout={handleLogout}
    />
  );
}
