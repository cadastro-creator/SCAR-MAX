import React, { useState, useEffect, useRef } from 'react'
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Fila from './Fila.jsx'
import Usuarios from './Usuarios.jsx'
import Painel from './Painel.jsx'
import Produtos from './Produtos.jsx'

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
  const [alertasVencidos, setAlertasVencidos] = useState(0)
  const [notificacoes, setNotificacoes] = useState([])
  const [sinoAberto, setSinoAberto] = useState(false)
  const sinoRef = useRef(null)

  // Sino de alertas em tempo real — produtos com timer (lê 1x via onSnapshot, sem custo extra)
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'produtos'), where('estado', 'in', ['ATIVO_TEMPORARIO', 'VPE_ATIVO'])),
      snap => {
        const agora = Date.now()
        const vencidos = snap.docs.filter(d => {
          const p = d.data()
          if (!p.timerInicio || !p.timerDias) return false
          const inicio = p.timerInicio.toDate ? p.timerInicio.toDate() : new Date(p.timerInicio)
          const fim = inicio.getTime() + p.timerDias * 24 * 60 * 60 * 1000
          return fim <= agora
        })
        setAlertasVencidos(vencidos.length)
      }
    )
    return unsub
  }, [])

  // Listener de notificações do sistema para o perfil do usuário
  useEffect(() => {
    if (!perfil?.perfil) return
    const q = query(
      collection(db, 'notificacoes'),
      where('perfis', 'array-contains', perfil.perfil)
    )
    const unsub = onSnapshot(q, snap => {
      const naoLidas = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(n => !n.leitores?.[user?.uid])
        .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0))
      setNotificacoes(naoLidas)
    })
    return () => unsub()
  }, [perfil?.perfil, user?.uid])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e) {
      if (sinoRef.current && !sinoRef.current.contains(e.target)) {
        setSinoAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  async function marcarLida(notifId) {
    await updateDoc(doc(db, 'notificacoes', notifId), {
      [`leitores.${user.uid}`]: new Date(),
    })
  }

  async function marcarTodasLidas() {
    for (const n of notificacoes) await marcarLida(n.id)
  }

  const totalSino = alertasVencidos + notificacoes.length

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
            {/* SINO — timers vencidos + notificações do sistema */}
            <div ref={sinoRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setSinoAberto(o => !o)}
                style={{
                  position: 'relative', cursor: 'pointer',
                  width: 34, height: 34, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: totalSino > 0 ? 'rgba(242,92,110,.12)' : 'var(--surface2)',
                  border: `1px solid ${totalSino > 0 ? 'rgba(242,92,110,.3)' : 'var(--border)'}`,
                }}
                title={totalSino > 0 ? `${totalSino} alerta(s)` : 'Nenhum alerta'}
              >
                <span style={{ fontSize: 15 }}>🔔</span>
                {totalSino > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: 'var(--red)', color: '#fff',
                    borderRadius: '50%', minWidth: 16, height: 16,
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                  }}>
                    {totalSino}
                  </span>
                )}
              </div>

              {/* DROPDOWN DO SINO */}
              {sinoAberto && (
                <div style={{
                  position: 'absolute', top: 42, right: 0, zIndex: 600,
                  width: 320, maxHeight: 440, overflowY: 'auto',
                  background: 'var(--surface)', border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius)', boxShadow: '0 8px 32px rgba(0,0,0,.4)',
                }}>

                  {/* Alertas de VPE/timer vencido */}
                  {alertasVencidos > 0 && (
                    <div
                      onClick={() => { setPaginaAtiva('produtos'); setSinoAberto(false) }}
                      style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }}
                    >
                      <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>
                        🔴 {alertasVencidos} produto{alertasVencidos > 1 ? 's' : ''} com timer vencido
                      </div>
                      <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                        Clique para ver em Produtos
                      </div>
                    </div>
                  )}

                  {/* Notificações do sistema */}
                  {notificacoes.length > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px 4px' }}>
                        <span style={{ color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>Notificações</span>
                        <button onClick={marcarTodasLidas} style={{ background: 'none', border: 'none', color: '#f97316', fontSize: 12, cursor: 'pointer' }}>
                          Marcar todas como lidas
                        </button>
                      </div>
                      {notificacoes.map(n => (
                        <div
                          key={n.id}
                          onClick={() => marcarLida(n.id)}
                          style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }}
                        >
                          <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>{n.titulo}</div>
                          <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{n.mensagem}</div>
                          {n.codigoCitel && (
                            <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#f97316', marginTop: 4, display: 'inline-block' }}>
                              CITEL: {n.codigoCitel}
                            </span>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {totalSino === 0 && (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#555', fontSize: 13 }}>
                      Nenhum alerta no momento
                    </div>
                  )}
                </div>
              )}
            </div>

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
  if (id === 'usuarios') return <Usuarios />
  if (id === 'painel') return <Painel />
  if (id === 'produtos') return <Produtos />
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