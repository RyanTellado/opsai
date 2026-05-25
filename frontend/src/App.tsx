import { useState } from "react";
import Upload from "./pages/Upload";
import Brief from "./pages/Brief";
import { createBriefing } from "./lib/api";
import type { BriefingBundle, DatasetResponse } from "./types";

type Stage = "upload" | "brief";

export default function App() {
  const [stage, setStage] = useState<Stage>("upload");
  const [dataset, setDataset] = useState<DatasetResponse | null>(null);
  const [bundle, setBundle] = useState<BriefingBundle | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

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

  function resetToUpload() {
    setStage("upload");
  }

  if (stage === "brief" && bundle) {
    return <Brief bundle={bundle} onBack={resetToUpload} />;
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
    />
  );
}
