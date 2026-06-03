// src/hooks/useSmartBack.js
// Smart back navigation hook — use this instead of navigate(-1) everywhere
// Safely returns to the correct tab/page regardless of browser history state

import { useNavigate, useLocation } from 'react-router-dom';

export default function useSmartBack(defaultTab = 'home') {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    const from = location.state?.from;
    const tab  = location.state?.tab || defaultTab;

    if (from === 'dashboard' || from === 'home' || from === 'profile' ||
        from === 'articles'  || from === 'jobs'  || from === 'posts') {
      // Came from dashboard — go back to correct tab
      navigate('/dashboard', { state: { tab } });
    } else if (window.history.length > 1) {
      // Has real browser history — safe to go back
      navigate(-1);
    } else {
      // No history — go to dashboard home as fallback
      navigate('/dashboard', { state: { tab: defaultTab } });
    }
  };

  return goBack;
}
