import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NearbyPlacesProvider } from './context/NearbyPlacesContext'
import { ChatProvider } from './context/ChatContext'
import FeedPage from './pages/FeedPage'
import AuthPage from './pages/AuthPage'
import SearchPage from './pages/SearchPage'
import SavedPage from './pages/SavedPage'
import ProfilePage from './pages/ProfilePage'
import ChatListPage from './pages/ChatListPage'
import ChatRoomPage from './pages/ChatRoomPage'

/**
 * ProtectedRoute — Redirige a /auth si el usuario no está autenticado.
 *
 * Envuelve las rutas que requieren sesión activa.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  return <>{children}</>
}

/**
 * AppRoutes — Configuración de rutas de la SPA.
 *
 * Estructura de rutas:
 *  /auth     → AuthPage (login / registro)
 *  /         → FeedPage (protegida)
 *  /search   → SearchPage (protegida)
 *  /saved    → SavedPage (protegida)
 *  /profile  → ProfilePage (protegida)
 *  *         → Redirect a /
 *
 * Tecnología: React Router v6 con <Routes> declarativas.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <FeedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved"
        element={
          <ProtectedRoute>
            <SavedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:roomId"
        element={
          <ProtectedRoute>
            <ChatRoomPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback: cualquier ruta desconocida vuelve al feed */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * App — Raíz de la aplicación.
 *
 * Árbol de providers:
 *  BrowserRouter → AuthProvider → AppRoutes
 *
 * BrowserRouter debe envolver todo para que los hooks de react-router
 * (useNavigate, NavLink, etc.) funcionen en cualquier componente hijo.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NearbyPlacesProvider>
          <ChatProvider>
            <AppRoutes />
          </ChatProvider>
        </NearbyPlacesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
