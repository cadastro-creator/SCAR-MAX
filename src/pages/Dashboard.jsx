import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Fila from './Fila.jsx'

const MENU = [
  { id: 'home',        icon: '⬡',  label: 'Dashboard'        },
  { id: 'fila',        icon: '📋', label: 'Fila de Cadastros' },
  { id: 'produtos',    icon: '📦', label: 'Produtos'          },
  { id: 'painel',      icon: '📊', label: 'Painel NEXUS'      },
  { id: 'usuarios',    icon: '👥', label: 'Usuários',   admin: true },
  { id: 'config',      icon: '⚙️', label: 'Configurações', admin: true },
  { id: 'treinamento', icon: '📚', label: 'Treinamento / POPs' },
]

export default function Dashboard() {
  const { user, perfil, logout } = useAuth()
  const isAdmin = ['SUPER_ADMIN', 'GESTOR_CADASTRO'].includes(perfil?.perfil)
  const [paginaAtiva, setPaginaAtiva] = useState('home')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* SIDEBAR */}
      <aside style={{
        width: 'var(--sidebar-w)',
        minHeight: '100%',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>

        {/* LOGO */}
        <div style={{
          padding: '20px 18px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 3,
            textTransform: 'uppercase', marginBottom: 6,
          }}>CONTATTOS</div>
          <div style={{
            fontSize: 20, fontWeight: 800,
            color: 'var(--text)', letterSpacing: -0.5, lineHeight: 1,
          }}>
            NEXUS <span style={{ color: 'var(--accent)' }}>MAX</span>
          </div>
          <div style={{
            fontSize: 10, color: 'var(--text3)',
            fontFamily: 'DM Mono, monospace', marginTop: 4,
          }}>v1.0 — Gestão de Cadastros</div>
        </div>

        {/* MENU */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          <div style={{
            padding: '10px 16px 4px',
            fontSize: 10, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1,
            textTransform: 'uppercase',
          }}>Menu</div>

          {MENU.filter(i => !i.admin || isAdmin).map(item => (
            <div
              key={item.id}
              onClick={() => setPaginaAtiva(item.id)}
              style={{
                margin: '2px 8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer',
                color: paginaAtiva === item.id ? 'var(--accent)' : 'var(--text2)',
                background: paginaAtiva === item.id ? 'var(--acc-dim)' : 'transparent',
                borderLeft: paginaAtiva === item.id ? '2px solid var(--accent)' : '2px solid transparent',
                fontSize: 13, fontWeight: 500,
                transition: 'all .12s',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </div>
          ))}
        </nav>

        {/* PERFIL */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              }} />
            ) : (
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--acc-dim)', border: '1px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
              }}>
                {(perfil?.nome || 'U')[0].toUpperCase()}
              </div>
            )}
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {perfil?.nome || user?.displayName || 'Usuário'}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--accent)',
                fontFamily: 'DM Mono, monospace', fontWeight: 600,
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

      {/* MAIN */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', background: 'var(--bg)',
      }}>

        {/* TOPBAR */}
        <header style={{
          height: 'var(--topbar-h)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 16, flexShrink: 0,
          background: 'var(--surface)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {MENU.find(m => m.id === paginaAtiva)?.label || 'Dashboard'}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 12, color: 'var(--text3)',
              fontFamily: 'DM Mono, monospace',
            }}>
              {user?.email}
            </span>
            <span className={`badge ${perfil?.perfil === 'SUPER_ADMIN' ? 'badge-orange' : 'badge-gray'}`}>
              {perfil?.perfil}
            </span>
          </div>
        </header>

        {/* CONTEÚDO */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <PaginaAtiva id={paginaAtiva} perfil={perfil} user={user} />
        </div>
      </main>
    </div>
  )
}

// ─── ROTEADOR DE PÁGINAS ──────────────────────────────────────────────────────
function PaginaAtiva({ id, perfil, user }) {
  if (id === 'home') return <PaginaHome perfil={perfil} user={user} />
  if (id === 'fila') return <Fila />
  return <EmConstrucao />
}

function EmConstrucao() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 64, height: 64,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28,
      }}>🚧</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)' }}>Em construção</div>
      <div style={{ fontSize: 13, color: 'var(--text3)' }}>Este módulo será implementado em breve.</div>
    </div>
  )
}

// ─── DASHBOARD HOME ───────────────────────────────────────────────────────────
function PaginaHome({ perfil, user }) {
  const [stats, setStats] = useState({
    abertas: null, aprovadas: null, analise: null, devolvidas: null
  })

  useEffect(() => {
    async function carregarStats() {
      try {
        const ref = collection(db, 'solicitacoes')

        const [abertas, analise, devolvidas, aprovadas] = await Promise.all([
          getDocs(query(ref, where('status', '==', 'AGUARDANDO'))),
          getDocs(query(ref, where('status', '==', 'EM_ANALISE'))),
          getDocs(query(ref, where('status', '==', 'DEVOLVIDA'))),
          getDocs(query(ref, where('status', '==', 'APROVADA'))),
        ])

        setStats({
          abertas:   abertas.size,
          analise:   analise.size,
          devolvidas: devolvidas.size,
          aprovadas:  aprovadas.size,
        })
      } catch {
        setStats({ abertas: 0, aprovadas: 0, analise: 0, devolvidas: 0 })
      }
    }
    carregarStats()
  }, [])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* HEADER */}
      <div>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: 'var(--text)',
          marginBottom: 4, letterSpacing: -0.5,
        }}>
          {saudacao}, {perfil?.nome || user?.displayName?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* CARDS DE KPI */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
      }}>
        {[
          { label: 'Aguardando',  valor: stats.abertas,    cor: 'var(--amber)',  bg: 'var(--amber-dim)',  icon: '⏳' },
          { label: 'Em Análise',  valor: stats.analise,    cor: 'var(--blue)',   bg: 'var(--blue-dim)',   icon: '🔍' },
          { label: 'Devolvidas',  valor: stats.devolvidas, cor: 'var(--orange)', bg: 'var(--orange-dim)', icon: '↩️' },
          { label: 'Aprovadas',   valor: stats.aprovadas,  cor: 'var(--green)',  bg: 'var(--green-dim)',  icon: '✅' },
        ].map((card, i) => (
          <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: .8,
              }}>
                {card.label}
              </span>
              <div style={{
                width: 32, height: 32,
                background: card.bg,
                borderRadius: 'var(--radius-xs)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15,
              }}>
                {card.icon}
              </div>
            </div>
            <div style={{
              fontSize: 36, fontWeight: 800,
              color: card.cor,
              fontFamily: 'DM Mono, monospace',
              lineHeight: 1,
            }}>
              {card.valor === null ? (
                <div style={{
                  width: 40, height: 36,
                  background: 'var(--surface2)',
                  borderRadius: 6,
                  animation: 'pulse 1.5s ease infinite',
                }} />
              ) : card.valor}
            </div>
          </div>
        ))}
      </div>

      {/* AVISO SISTEMA */}
      <div style={{
        background: 'var(--acc-dim)',
        border: '1px solid rgba(249,115,22,.25)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--acc-dim2)',
          borderRadius: 'var(--radius-xs)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
        }}>🚀</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
            NEXUS MAX — Sistema em implantação
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
            O sistema está operacional. Os módulos serão ativados progressivamente.
            Próximo passo: <strong style={{ color: 'var(--text)' }}>Central de Cadastros</strong> — fila de solicitações e aprovações.
          </div>
        </div>
      </div>

    </div>
  )
}