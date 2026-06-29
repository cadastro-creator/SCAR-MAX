import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AcessoNegado from './pages/AcessoNegado.jsx'

function PrivateRoute({ children }) {
  const { authStatus } = useAuth()

  if (authStatus === 'loading') return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)', color: 'var(--text2)',
      fontFamily: 'DM Sans, sans-serif', fontSize: 14,
      flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid var(--surface3)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin .8s linear infinite'
      }} />
      <span>Carregando NEXUS...</span>
    </div>
  )

  if (authStatus === 'unauthorized') return <AcessoNegado />
  if (authStatus === 'unauthenticated') return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}