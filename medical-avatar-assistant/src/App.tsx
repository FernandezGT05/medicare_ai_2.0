import { Navigate, Route, Routes } from "react-router-dom";
import { ScrollToTopButton } from "./components/ScrollToTopButton";
import { ScrollToTopOnNavigate } from "./components/ScrollToTopOnNavigate";
import { ConsultationPage } from "./pages/ConsultationPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HomePage } from "./pages/HomePage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { SignInPage } from "./pages/SignInPage";

export default function App() {
  return (
    <>
      <ScrollToTopOnNavigate />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/consultation" element={<ConsultationPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/history" element={<Navigate to="/dashboard" replace />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ScrollToTopButton />
    </>
  );
}
