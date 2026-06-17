import { Navigate, Route, Routes } from 'react-router-dom';

import OnboardingLayout from './OnboardingLayout';
import CustomActivityPage from './pages/CustomActivityPage';
import CustomEmbeddingsPage from './pages/CustomEmbeddingsPage';
import CustomInferencePage from './pages/CustomInferencePage';
import CustomOAuthPage from './pages/CustomOAuthPage';
import CustomSearchPage from './pages/CustomSearchPage';
import CustomVoicePage from './pages/CustomVoicePage';
import VaultSetupStep from './pages/VaultSetupStep';
import WelcomePage from './pages/WelcomePage';

/**
 * Routed onboarding flow.
 *
 *   welcome → /custom/inference → voice → oauth → search → embeddings → vault → /home
 *
 * Each step renders the local/custom configuration controls directly.
 * Gmail/Composio (`/onboarding/skills`) and Composio-driven
 * context gathering (`/onboarding/context`) are gone from the default
 * flow; their step + page files remain on disk in case we want to revive
 * them later.
 */
const Onboarding = () => {
  return (
    <Routes>
      <Route element={<OnboardingLayout />}>
        <Route index element={<Navigate to="welcome" replace />} />
        <Route path="welcome" element={<WelcomePage />} />
        <Route
          path="runtime-choice"
          element={<Navigate to="/onboarding/custom/inference" replace />}
        />
        <Route path="custom/inference" element={<CustomInferencePage />} />
        <Route path="custom/voice" element={<CustomVoicePage />} />
        <Route path="custom/oauth" element={<CustomOAuthPage />} />
        <Route path="custom/search" element={<CustomSearchPage />} />
        <Route path="custom/embeddings" element={<CustomEmbeddingsPage />} />
        <Route path="custom/activity" element={<CustomActivityPage />} />
        <Route path="custom/vault" element={<VaultSetupStep />} />
        {/* <Route path="custom/memory" element={<CustomMemoryPage />} /> */}
        <Route path="*" element={<Navigate to="welcome" replace />} />
      </Route>
    </Routes>
  );
};

export default Onboarding;
