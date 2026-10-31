import React from 'react';
import { describe, expect, it } from 'vitest';
import { Navigate, matchRoutes, type RouteObject } from 'react-router-dom';
import { AppRoutes } from '@/app/routes';
import { isNavigationActive, ROUTES } from '@/app/routePaths';

const routeTree: RouteObject[] = [
  { path: '/', element: <Navigate to={ROUTES.overview} replace /> },
  {
    children: [
      { path: ROUTES.overview }, { path: ROUTES.repository }, { path: ROUTES.sessions },
      { path: `${ROUTES.sessions}/:sessionId` }, { path: ROUTES.processes }, { path: ROUTES.intent }, { path: '*' },
    ],
  },
];

describe('application routing', () => {
  it('redirects the root control surface to overview', () => {
    const root = routeTree[0].element as React.ReactElement<{ to?: string; replace?: boolean }>;
    expect(root.type).toBe(Navigate);
    expect(root.props.to).toBe(ROUTES.overview);
    expect(root.props.replace).toBe(true);
  });

  it.each([ROUTES.overview, ROUTES.repository, ROUTES.sessions, ROUTES.processes, ROUTES.intent])('matches the %s application route', (path) => {
    expect(matchRoutes(routeTree, path)?.at(-1)?.route.path).toBe(path);
  });

  it('matches a session detail route with its URL parameter', () => {
    const match = matchRoutes(routeTree, '/sessions/session-001')?.at(-1);
    expect(match?.params.sessionId).toBe('session-001');
    expect(match?.route.path).toBe('/sessions/:sessionId');
  });

  it('sends unknown routes to the not-found branch', () => {
    expect(matchRoutes(routeTree, '/unavailable')?.at(-1)?.route.path).toBe('*');
  });

  it('keeps Sessions active only for its nested session detail routes', () => {
    expect(isNavigationActive('/sessions', ROUTES.sessions, true)).toBe(true);
    expect(isNavigationActive('/sessions/session-001', ROUTES.sessions, true)).toBe(true);
    expect(isNavigationActive('/sessions-archive', ROUTES.sessions, true)).toBe(false);
    expect(isNavigationActive('/repository', ROUTES.sessions, true)).toBe(false);
  });

  it('keeps application routes inside one shared route tree', () => {
    expect(AppRoutes).toBeTypeOf('function');
    expect(matchRoutes(routeTree, '/sessions/session-404')?.at(-1)?.route.path).toBe('/sessions/:sessionId');
  });
});
