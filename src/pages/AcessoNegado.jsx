import React from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function AcessoNegado() {
  const { user, logout } = useAuth()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius)',
        padding: '48px 40px',
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
      }}>

        {/* Ícone */}
        <div style={{
          width: 64, height: 64,
          background: 'var(--red-dim)',
          border: '1px solid rgba(242,92,110,.25)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28,
        }}>
          🔒
        </div>

        {/* Título */}
        <div style={{
          fontSize: 20, fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 8, letterSpacing: -0.3,
        }}>
          Acesso não autorizado
        </div>

        {/* Subtítulo */}
        <div style={{
          fontSize: 13, color: 'var(--text3)',
          lineHeight: 1.6, marginBottom: 24,
        }}>
          Sua conta não possui acesso ao NEXUS MAX.<br />
          O acesso é concedido apenas por convite.
        </div>

        {/* Email logado */}
        {user?.email && (
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 16px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                style={{ width: 20, height: 20, borderRadius: '50%' }}
              />
            )}
            <span style={{
              fontSize: 12,
              color: 'var(--text2)',
              fontFamily: 'DM Mono, monospace',
            }}>
              {user.email}
            </span>
          </div>
        )}

        {/* Instrução */}
        <div style={{
          background: 'var(--acc-dim)',
          border: '1px solid rgba(249,115,22,.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 16px',
          marginBottom: 28,
          textAlign: 'left',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: .5,
            marginBottom: 6,
          }}>
            Como obter acesso?
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
            Solicite ao administrador do sistema que envie um convite para o e-mail da sua conta Google.
          </div>
        </div>

        {/* Botão sair */}
        <button
          className="btn btn-ghost"
          onClick={logout}
          style={{ width: '100%', justifyContent: 'center', padding: '11px 18px' }}
        >
          Sair e usar outra conta
        </button>

        {/* Rodapé */}
        <div style={{
          fontSize: 10, color: 'var(--text3)',
          marginTop: 24, letterSpacing: 1,
          fontFamily: 'DM Mono, monospace',
        }}>
          NEXUS MAX · CONTATTOS
        </div>
      </div>
    </div>
  )
}