import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

const MENU = [
  { id: 'home',       icon: '⬡',  label: 'Dashboard'       },
  { id: 'fila',       icon: '📋', label: 'Fila de Cadastros' },
  { id: 'produtos',   icon: '📦', label: 'Produtos'          },
  { id: 'estoque',    icon: '📊', label: 'Painel S.C.A.R'   },
  { id: 'usuarios',   icon: '👥', label: 'Usuários',  admin: true },
  { id: 'config',     icon: '⚙️', label: 'Configurações', admin: true },
  { id: 'treinamento',icon: '📚', label: 'Treinamento / POPs' },
]

export default function Dashboard() {
  const { user, perfil, logout } = useAuth()
  const [paginaAtiva, setPaginaAtiva] = useState('home')
  const [sidebarAberta, setSidebarAberta] = useState(false)

  const isAdmin = perfil?.perfil === 'SUPER_ADMIN' || perfil?.perfil === 'GESTOR_CADASTRO'

  function menuFiltrado() {
    return MENU.filter(item => !item.admin || isAdmin)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* BACKDROP MOBILE */}
      {sidebarAberta && (
        <div onClick={() => setSidebarAberta(false)} style={{
          display: 'none',
          position: 'fixed', inset: 0, zIndex: 199,
          background: 'rgba(0,0,0,.65)',
          backdropFilter: 'blur(3px)'
        }} />
      )}

      {/* SIDEBAR */}
      <aside style={{
        width: 'var(--sidebar-w)',
        minHeight: '100%',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 200,
      }}>

        {/* LOGO */}
        <div style={{
          padding: '18px 18px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text3)',
            letterSpacing: 2,
            textTransform: 'uppercase'
          }}>CONTATTOS</div>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: -0.5
          }}>
            S.C.A.R <span style={{ color: 'var(--accent)' }}>MAX</span>
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--text3)',
            fontFamily: 'DM Mono, monospace'
          }}>v1.0</div>
        </div>

        {/* MENU */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          <div style={{
            padding: '10px 12px 4px',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text3)',
            letterSpacing: '.8px',
            textTransform: 'uppercase'
          }}>Menu</div>

          {menuFiltrado().map(item => (
            <div
              key={item.id}
              onClick={() => setPaginaAtiva(item.id)}
              style={{
                margin: '1px 8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                color: paginaAtiva === item.id ? 'var(--accent)' : 'var(--text2)',
                background: paginaAtiva === item.id ? 'var(--acc-dim)' : 'transparent',
                fontSize: 13,
                fontWeight: 500,
                transition: 'background .12s, color .12s',
                minHeight: 44,
                userSelect: 'none'
              }}
            >
              <span style={{ fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </div>
          ))}
        </nav>

        {/* FOOTER SIDEBAR */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <img
              src={user?.photoURL || ''}
              alt=""
              style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: 'var(--surface2)',
                flexShrink: 0
              }}
            />
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {perfil?.nome || user?.displayName || 'Usuário'}
              </div>
              <div style={{
                fontSize: 10,
                color: 'var(--text3)',
                fontFamily: 'DM Mono, monospace'
              }}>
                {perfil?.perfil || 'SEM PERFIL'}
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={logout}
            style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '7px 12px' }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)'
      }}>

        {/* TOPBAR */}
        <header style={{
          height: 'var(--topbar-h)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 16,
          flexShrink: 0,
          background: 'var(--surface)'
        }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text)'
          }}>
            {MENU.find(m => m.id === paginaAtiva)?.label || 'Dashboard'}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 12,
              color: 'var(--text3)',
              fontFamily: 'DM Mono, monospace'
            }}>
              {user?.email}
            </span>
            {perfil && (
              <span className={`badge ${perfil.perfil === 'SUPER_ADMIN' ? 'badge-blue' : 'badge-gray'}`}>
                {perfil.perfil}
              </span>
            )}
          </div>
        </header>

        {/* ÁREA DE CONTEÚDO */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24
        }}>
          <PaginaAtiva id={paginaAtiva} perfil={perfil} user={user} />
        </div>
      </main>
    </div>
  )
}

function PaginaAtiva({ id, perfil, user }) {
  if (id === 'home') return <PaginaHome perfil={perfil} user={user} />
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      flexDirection: 'column',
      gap: 12,
      color: 'var(--text3)'
    }}>
      <div style={{ fontSize: 48 }}>🚧</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)' }}>Em construção</div>
      <div style={{ fontSize: 13 }}>Este módulo será implementado em breve.</div>
    </div>
  )
}

function PaginaHome({ perfil, user }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* BOAS VINDAS */}
      <div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 4
        }}>
          Olá, {perfil?.nome || user?.displayName?.split(' ')[0] || 'usuário'} 👋
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>
          Bem-vindo ao S.C.A.R MAX — Sistema de Controle e Acompanhamento de Registros.
        </p>
      </div>

      {/* CARDS DE STATUS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16
      }}>
        {[
          { label: 'Solicitações Abertas', valor: '—', cor: 'var(--amber)',   icon: '📋' },
          { label: 'Aprovadas Hoje',       valor: '—', cor: 'var(--green)',   icon: '✅' },
          { label: 'Em Análise',           valor: '—', cor: 'var(--accent)',  icon: '🔍' },
          { label: 'Devolvidas',           valor: '—', cor: 'var(--orange)',  icon: '↩️' },
        ].map((card, i) => (
          <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {card.label}
              </span>
              <span style={{ fontSize: 20 }}>{card.icon}</span>
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 700,
              color: card.cor,
              fontFamily: 'DM Mono, monospace'
            }}>
              {card.valor}
            </div>
          </div>
        ))}
      </div>

      {/* AVISO DE CONFIGURAÇÃO */}
      <div style={{
        background: 'var(--acc-dim)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start'
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>ℹ️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
            Sistema em configuração inicial
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
            O S.C.A.R MAX está sendo configurado. Os módulos serão ativados progressivamente.
            Se você está vendo esta tela, o acesso está funcionando corretamente.
          </div>
        </div>
      </div>

    </div>
  )
}