export const ROUTES = {
  overview: '/overview',
  repository: '/repository',
  sessions: '/sessions',
  processes: '/processes',
  intent: '/intent',
} as const;

/** Keeps nested route highlighting independent of transient UI state. */
export const isNavigationActive = (pathname: string, route: string, nested = false) =>
  nested ? pathname === route || pathname.startsWith(`${route}/`) : pathname === route;
