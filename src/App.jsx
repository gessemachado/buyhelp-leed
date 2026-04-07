import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import { pb } from './lib/pocketbase'
import LoginScreen           from './screens/LoginScreen'
import HomeScreen            from './screens/HomeScreen'
import CaptureScreen         from './screens/CaptureScreen'
import LeadsScreen           from './screens/LeadsScreen'
import SettingsScreen        from './screens/SettingsScreen'
import KanbanScreen          from './screens/KanbanScreen'
import AdminLoginScreen      from './screens/admin/AdminLoginScreen'
import AdminEventsScreen     from './screens/admin/AdminEventsScreen'
import AdminEventLeadsScreen from './screens/admin/AdminEventLeadsScreen'

function ProtectedRoute({ children }) {
  if (!pb.authStore.isValid) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  try {
    const raw = localStorage.getItem('pocketbase_auth')
    if (!raw || !JSON.parse(raw).token) return <Navigate to="/admin/login" replace />
  } catch {
    return <Navigate to="/admin/login" replace />
  }
  return children
}

// Rota que exige eventos_access: true (ou superuser)
function EventosAdminRoute({ children }) {
  try {
    const raw = localStorage.getItem('pocketbase_auth')
    if (!raw) return <Navigate to="/admin/login" replace />
    const auth = JSON.parse(raw)
    if (!auth.token) return <Navigate to="/admin/login" replace />
    const model = auth.model || {}
    // Superusers (_superusers collection) têm acesso total
    const isSuperuser = model.collectionName === '_superusers' || model.collectionId === '_superusers'
    if (!isSuperuser && model.eventos_access !== true) return <Navigate to="/admin/kanban" replace />
  } catch {
    return <Navigate to="/admin/login" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* App mobile */}
      <Route path="/login"   element={<LoginScreen />} />
      <Route path="/home"    element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
      <Route path="/capture" element={<ProtectedRoute><CaptureScreen /></ProtectedRoute>} />
      <Route path="/leads"    element={<ProtectedRoute><LeadsScreen /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
      <Route path="/admin/kanban" element={<AdminRoute><KanbanScreen /></AdminRoute>} />

      {/* Admin web */}
      <Route path="/admin/login"          element={<AdminLoginScreen />} />
      <Route path="/admin"                element={<AdminRoute><Navigate to="/admin/kanban" replace /></AdminRoute>} />
      <Route path="/admin/eventos"        element={<EventosAdminRoute><AdminEventsScreen /></EventosAdminRoute>} />
      <Route path="/admin/eventos/:id"    element={<EventosAdminRoute><AdminEventLeadsScreen /></EventosAdminRoute>} />

      <Route path="*" element={<Navigate to={pb.authStore.isValid ? '/home' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
