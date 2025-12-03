// 🗺️ 애플리케이션의 모든 경로를 여기서 관리해요
// 경로가 바뀌면 여기만 수정하면 됩니다!

export const ROUTES = {
  // 공개 페이지
  HOME: '/',
  LOGIN: '/login',

  // 인증 관련
  AUTH: {
    CALLBACK: '/auth/callback',
    LOGOUT: '/api/auth/logout',
  },

  // 보호된 페이지 (로그인 필요)
  DASHBOARD: '/dashboard',
  REPOSITORIES: '/repositories',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',

  // API 경로
  API: {
    GITHUB: {
      REPOS: '/api/github/repos',
      COMMITS: '/api/github/commits',
      SYNC: '/api/github/sync',
    },
    ESTIMATION: {
      REQUEST: '/api/estimation/request',
      HISTORY: '/api/estimation/history',
    },
    FEEDBACK: {
      SUBMIT: '/api/feedback/submit',
    },
  },
} as const;

// 로그인이 필요한 경로들
export const PROTECTED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.REPOSITORIES,
  ROUTES.ANALYTICS,
  ROUTES.SETTINGS,
] as const;

// 로그인 상태에서는 접근할 수 없는 경로들 (이미 로그인했으면 대시보드로)
export const AUTH_ROUTES = [ROUTES.LOGIN] as const;
