import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import OverviewPage from '@/components/pages/OverviewPage';
import RepositoryEvolution from '@/components/pages/RepositoryEvolution';
import SessionsPage from '@/components/pages/SessionsPage';
import SessionDetailPage from '@/components/pages/SessionDetailPage';
import ProcessTreePage from '@/components/pages/ProcessTreePage';
import IntentPage from '@/components/pages/IntentPage';
import NotFoundPage from '@/components/pages/NotFoundPage';
import { ROUTES } from './routePaths';

export { ROUTES, isNavigationActive } from './routePaths';

/** The URL is the single source of truth for application navigation. */
export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to={ROUTES.overview} replace />} />
    <Route element={<MainLayout />}>
      <Route path={ROUTES.overview} element={<OverviewPage />} />
      <Route path={ROUTES.repository} element={<RepositoryEvolution />} />
      <Route path={ROUTES.sessions} element={<SessionsPage />} />
      <Route path={`${ROUTES.sessions}/:sessionId`} element={<SessionDetailPage />} />
      <Route path={ROUTES.processes} element={<ProcessTreePage />} />
      <Route path={ROUTES.intent} element={<IntentPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

