import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AppShell } from "./components/layout/AppShell";
import { LegacyRedirect } from "./components/layout/LegacyRedirect";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { Toast } from "./components/layout/Toast";
import { DashboardPage } from "./pages/DashboardPage";
import { CalendarPage } from "./pages/CalendarPage";
import { HistoryPage } from "./pages/HistoryPage";
import { WorkoutsPage } from "./pages/WorkoutsPage";
import { TemplateEditorPage } from "./pages/TemplateEditorPage";
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
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/workouts" element={<WorkoutsPage />} />
          <Route path="/workouts/new" element={<TemplateEditorPage />} />
          <Route path="/workouts/edit/:code" element={<TemplateEditorPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/progress/exercise/:exerciseName" element={<ExerciseDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />

          {/*
            Legacy hash links. "/" previously showed records and now shows the
            dashboard — an accepted change, since the dashboard links onward to
            history. Everything else redirects.

            Order matters: "/progress/:exerciseName" would otherwise swallow
            "/progress/exercise/:exerciseName", so it must be declared after it.
          */}
          <Route path="/records" element={<Navigate to="/history" replace />} />
          <Route path="/templates" element={<Navigate to="/workouts" replace />} />
          <Route path="/templates/new" element={<Navigate to="/workouts/new" replace />} />
          <Route
            path="/templates/edit/:code"
            element={<LegacyRedirect to="/workouts/edit/:code" />}
          />
          <Route
            path="/progress/:exerciseName"
            element={<LegacyRedirect to="/progress/exercise/:exerciseName" />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <ModalContainer />
      <Toast />
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
