import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Header } from "./components/layout/Header";
import { BottomNav } from "./components/layout/BottomNav";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { Toast } from "./components/layout/Toast";
import { RecordsPage } from "./pages/RecordsPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { SettingsModal } from "./components/settings/SettingsModal";
import { SyncModal } from "./components/sync/SyncModal";
import { PasscodeGate } from "./components/auth/PasscodeGate";
import { useApp } from "./context/AppContext";

function ModalContainer() {
  const { activeModal } = useApp();
  if (activeModal === "settings") return <SettingsModal />;
  if (activeModal === "sync") return <SyncModal />;
  return null;
}

function AppInner() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<RecordsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/progress/:exerciseName" element={<ExerciseDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ModalContainer />
      <Toast />
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <PasscodeGate>
      <AppProvider>
        <HashRouter>
          <AppInner />
        </HashRouter>
      </AppProvider>
    </PasscodeGate>
  );
}
