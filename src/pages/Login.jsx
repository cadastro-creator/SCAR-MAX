import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Login() {
  const { loginGoogle, user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  React.useEffect(() => {
    if (user) navigate('/')
  }, [user])

  async function handleLogin() {
    setErro('')
    setLoading(true)
    try {
      await loginGoogle()
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user') {
        setErro('Login cancelado.')
      } else if (e.code === 'auth/user-disabled') {
        setErro('Usuário desativado. Contate o administrador.')
      } else {
        setErro('Erro ao fazer login. Tente novamente.')
      }
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
      padding: 20
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '48px 40px',
        width: '100%',
        maxWidth: 380,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24
      }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text3)',
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 8
          }}>
            CONTATTOS
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: -1,
            lineHeight: 1
          }}>
            S.C.A.R <span style={{ color: 'var(--accent)' }}>MAX</span>
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text3)',
            marginTop: 6,
            fontFamily: 'DM Mono, monospace'
          }}>
            Sistema de Controle e Acompanhamento de Registros
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{
          width: '100%',
          height: 1,
          background: 'var(--border)'
        }} />

        {/* LOGIN */}
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <p style={{
            color: 'var(--text2)',
            fontSize: 13,
            textAlign: 'center',
            lineHeight: 1.5
          }}>
            Acesse com sua conta Google corporativa
          </p>

          <button
            className="btn btn-primary"
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 14 }}
          >
            {loading ? 'Entrando...' : '🔐 Entrar com Google'}
          </button>

          {erro && (
            <div style={{
              background: 'var(--red-dim)',
              color: 'var(--red)',
              border: '1px solid var(--red)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: 12,
              textAlign: 'center'
            }}>
              {erro}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          fontSize: 11,
          color: 'var(--text3)',
          textAlign: 'center',
          lineHeight: 1.5
        }}>
          Acesso restrito a usuários autorizados.<br />
          Em caso de problemas, contate o administrador.
        </div>
      </div>
    </div>
  )
}