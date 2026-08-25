import { useState, type FormEvent } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { dashboardForRole, guardDestination } from "./auth/routing";
import type { Role } from "./auth/types";
import { TeacherClassesPage } from "./teacher/pages/TeacherClassesPage";
import { TeacherContextPage } from "./teacher/pages/TeacherContextPage";
import { TeacherMaterialPage } from "./teacher/pages/TeacherMaterialPage";

interface NavigationItem {
  label: string;
  path: string;
  glyph: string;
}

const NAVIGATION: Record<Role, NavigationItem[]> = {
  teacher: [
    { label: "Dashboard", path: "/teacher/dashboard", glyph: "▦" },
    { label: "Classes", path: "/teacher/classes", glyph: "◇" },
    { label: "Assignments", path: "/teacher/assignments", glyph: "▤" },
    { label: "Grades", path: "/teacher/grades", glyph: "✦" },
  ],
  headmaster: [
    { label: "Dashboard", path: "/headmaster/dashboard", glyph: "▦" },
    { label: "Classes", path: "/headmaster/classes", glyph: "◇" },
    { label: "Students", path: "/headmaster/students", glyph: "◎" },
    { label: "Teachers", path: "/headmaster/teachers", glyph: "♧" },
    { label: "Subjects", path: "/headmaster/subjects", glyph: "✦" },
  ],
  student: [
    { label: "Dashboard", path: "/student/dashboard", glyph: "▦" },
    { label: "Classes", path: "/student/classes", glyph: "◇" },
    { label: "Assignments", path: "/student/assignments", glyph: "▤" },
    { label: "Grades", path: "/student/grades", glyph: "✦" },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  teacher: "Teacher workspace",
  headmaster: "Headmaster workspace",
  student: "Student workspace",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function LoadingScreen({ message = "Restoring your secure session" }: { message?: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-orb" />
      <p>{message}</p>
    </div>
  );
}

export function ProtectedRoute({ role }: { role: Role }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  const destination = guardDestination(location.pathname, user);
  if (destination) return <Navigate to={destination} replace />;
  if (!user || user.role !== role) return <Navigate to="/login" replace />;

  return <Outlet />;
}

function RoleLayout({ role }: { role: Role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={`portal-shell portal-shell-${role}`}>
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-emblem">K12</div>
          <div>
            <p className="brand-name">K-12</p>
            <p className="brand-name">Academy</p>
            <p className="brand-subtitle">Academic Portal</p>
          </div>
        </div>

        <div className="workspace-summary">
          <span className="eyebrow">Signed in as</span>
          <strong>{user.name}</strong>
          <span>{ROLE_LABELS[role]}</span>
        </div>

        <nav className="role-navigation" aria-label={`${role} navigation`}>
          {NAVIGATION[role].map((item) => (
            <NavLink
              className={({ isActive }) => (isActive ? "nav-item nav-item-active" : "nav-item")}
              key={item.path}
              to={item.path}
            >
              <span className="nav-glyph" aria-hidden="true">
                {item.glyph}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar avatar-small">{initials(user.name)}</span>
            <span className="user-chip-copy">
              <strong>{user.name}</strong>
              <span>{role}</span>
            </span>
          </div>
          <button className="logout-button" onClick={() => void handleLogout()} type="button">
            <span aria-hidden="true">↪</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <span className="topbar-kicker">Unified learning environment</span>
            <strong>{ROLE_LABELS[role]}</strong>
          </div>
          <div className="topbar-user">
            <span className="avatar">{initials(user.name)}</span>
            <span>{user.name}</span>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Academic portal / {title}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className="role-pill">{ROLE_LABELS[user.role]}</span>
      </div>

      <div className="placeholder-grid">
        <article className="placeholder-card placeholder-card-primary">
          <span className="placeholder-icon">✦</span>
          <div>
            <span className="eyebrow">Access verified</span>
            <h2>Your workspace is ready.</h2>
            <p>This protected placeholder confirms that your {user.role} session is active.</p>
          </div>
        </article>
        <article className="placeholder-card placeholder-card-secondary">
          <span className="eyebrow">Next step</span>
          <h2>Role-based access is enabled.</h2>
          <p>Academic features will appear here in a later LMS slice.</p>
        </article>
      </div>
    </section>
  );
}

function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) return <LoadingScreen message="Checking your session" />;
  if (user) return <Navigate to={dashboardForRole(user.role)} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const authenticatedUser = await login(username, password);
      navigate(dashboardForRole(authenticatedUser.role), { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-intro">
        <div className="brand-lockup brand-lockup-light">
          <div className="brand-emblem brand-emblem-light">K12</div>
          <div>
            <p className="brand-name">K-12</p>
            <p className="brand-name">Academy</p>
            <p className="brand-subtitle">Academic Portal</p>
          </div>
        </div>
        <div className="login-intro-copy">
          <span className="eyebrow">A focused place to learn</span>
          <h1>Welcome back to your academic workspace.</h1>
          <p>Sign in once to continue to the tools and spaces connected to your role.</p>
        </div>
        <div className="login-intro-note">
          <span className="intro-note-dot" />
          <span>Secure role-based access</span>
        </div>
      </section>

      <section className="login-card-wrap">
        <div className="login-card">
          <div className="login-card-heading">
            <span className="eyebrow">Academic Portal</span>
            <h2>Sign in</h2>
            <p>Use your username and password to continue.</p>
          </div>

          <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
            <label htmlFor="username">Username</label>
            <input
              autoComplete="username"
              id="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              required
              value={username}
            />

            <label htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              type="password"
              value={password}
            />

            {error ? <p className="form-error" role="alert">{error}</p> : null}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in…" : "Sign in"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="login-footer-copy">Your session is protected and role-aware.</p>
        </div>
      </section>
    </div>
  );
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return <Navigate to={user ? dashboardForRole(user.role) : "/login"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />

      <Route element={<ProtectedRoute role="teacher" />} path="/teacher">
        <Route element={<RoleLayout role="teacher" />}>
          <Route element={<Navigate replace to="dashboard" />} index />
          <Route element={<PlaceholderPage description="Your protected teacher workspace is active." title="Dashboard" />} path="dashboard" />
          <Route element={<TeacherClassesPage />} path="classes" />
          <Route element={<TeacherContextPage />} path="classes/:contextId" />
          <Route element={<TeacherMaterialPage mode="create" />} path="classes/:contextId/materials/new" />
          <Route element={<TeacherMaterialPage mode="edit" />} path="classes/:contextId/materials/:materialId/edit" />
          <Route element={<TeacherMaterialPage mode="view" />} path="classes/:contextId/materials/:materialId" />
          <Route element={<PlaceholderPage description="Assignment tools will be added in a later LMS slice." title="Assignments" />} path="assignments" />
          <Route element={<PlaceholderPage description="Grade tools will be added in a later LMS slice." title="Grades" />} path="grades" />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="headmaster" />} path="/headmaster">
        <Route element={<RoleLayout role="headmaster" />}>
          <Route element={<Navigate replace to="dashboard" />} index />
          <Route element={<PlaceholderPage description="Your protected headmaster workspace is active." title="Dashboard" />} path="dashboard" />
          <Route element={<PlaceholderPage description="Class tools will be added in a later LMS slice." title="Classes" />} path="classes" />
          <Route element={<PlaceholderPage description="Student tools will be added in a later LMS slice." title="Students" />} path="students" />
          <Route element={<PlaceholderPage description="Teacher tools will be added in a later LMS slice." title="Teachers" />} path="teachers" />
          <Route element={<PlaceholderPage description="Subject tools will be added in a later LMS slice." title="Subjects" />} path="subjects" />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="student" />} path="/student">
        <Route element={<RoleLayout role="student" />}>
          <Route element={<Navigate replace to="dashboard" />} index />
          <Route element={<PlaceholderPage description="Your protected student workspace is active." title="Dashboard" />} path="dashboard" />
          <Route element={<PlaceholderPage description="Class tools will be added in a later LMS slice." title="Classes" />} path="classes" />
          <Route element={<PlaceholderPage description="Assignment tools will be added in a later LMS slice." title="Assignments" />} path="assignments" />
          <Route element={<PlaceholderPage description="Grade tools will be added in a later LMS slice." title="Grades" />} path="grades" />
        </Route>
      </Route>

      <Route element={<RootRedirect />} path="/" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
