import ArticleDetail from "./pages/ArticleDetail";
import WriteArticle from "./pages/WriteArticle";
import Admin from "./pages/Admin";
import RoleSelect from "./pages/RoleSelect";
import PostJob from "./pages/PostJob";
import JobDetail from "./pages/JobDetail";
import CreatePost from "./pages/CreatePost";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import IndustrySwap from './components/IndustrySwap';
import EditProfile from './pages/EditProfile';
import UserProfilePage from './pages/UserProfilePage';
import MyCirclePage from './pages/MyCirclePage';
import WallOfFamePage from './pages/WallOfFamePage';
import WeeklyGamePage from './pages/WeeklyGamePage';
import Settings from './pages/Settings';
import MessagesPage from './pages/MessagesPage';
import ChatPage from './pages/ChatPage';

// Pages
import Splash from "./pages/Splash";
import CompanyDashboard from "./pages/CompanyDashboard";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import EmailLogin from "./pages/EmailLogin";
import EmailSignup from "./pages/EmailSignup";
import Signup from "./pages/Signup";
import IndustrySelect from "./pages/IndustrySelect";
import PlanSelect from "./pages/PlanSelect";
import Dashboard from "./pages/Dashboard";
import Subscribe from "./pages/Subscribe";
import Certificate from "./pages/Certificate";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CompanyDetailPage from "./pages/CompanyDetailPage";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function DashboardRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <div className="loading-screen">Loading...</div>;
  if (!profile.onboardingDone) return <Navigate to="/onboarding" replace />;
  if (!profile.onboardingComplete) return <Navigate to="/industry-select" replace />;
  if (!profile.userType) return <Navigate to="/role-select" replace />;
  if (profile.userType === "company") return <Navigate to="/company/dashboard" replace />;
  if (profile.userType === "seeker" && !profile.plan) return <Navigate to="/plan-select" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/industry-select" element={<PrivateRoute><IndustrySelect /></PrivateRoute>} />
        <Route path="/role-select" element={<PrivateRoute><RoleSelect /></PrivateRoute>} />
        <Route path="/plan-select" element={<PrivateRoute><PlanSelect /></PrivateRoute>} />
        <Route path="/dashboard" element={<DashboardRoute><Dashboard /></DashboardRoute>} />
        <Route path="/subscribe" element={<PrivateRoute><Subscribe /></PrivateRoute>} />
        <Route path="/certificate" element={<PrivateRoute><Certificate /></PrivateRoute>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/article/:articleId" element={<PrivateRoute><ArticleDetail /></PrivateRoute>} />
        <Route path="/write-article" element={<DashboardRoute><WriteArticle /></DashboardRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/post-job" element={<PrivateRoute><PostJob /></PrivateRoute>} />
        <Route path="/jobs/:jobId" element={<PrivateRoute><JobDetail /></PrivateRoute>} />
        <Route path="/create-post" element={<PrivateRoute><CreatePost /></PrivateRoute>} />
        <Route path="/industry-swap" element={<PrivateRoute><IndustrySwap /></PrivateRoute>} />
        <Route path="/edit-profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
        <Route path="/profile/:uid" element={<PrivateRoute><UserProfilePage /></PrivateRoute>} />
        <Route path="/my-circle" element={<PrivateRoute><MyCirclePage /></PrivateRoute>} />
        <Route path="/wall-of-fame" element={<PrivateRoute><WallOfFamePage /></PrivateRoute>} />
        <Route path="/weekly-game" element={<PrivateRoute><WeeklyGamePage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/company/:companyId" element={<PrivateRoute><CompanyDetailPage /></PrivateRoute>} />
        <Route path="/login/email"  element={<PublicRoute><EmailLogin /></PublicRoute>} />
        <Route path="/signup/email" element={<PublicRoute><EmailSignup /></PublicRoute>} />
        <Route path="/messages" element={<PrivateRoute><MessagesPage /></PrivateRoute>} />
        <Route path="/messages/:conversationId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
