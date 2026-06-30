import React, { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getConfigSistema, criarLembreteVPE } from '../services/notificacoes.js'

const ESTADO_CONFIG = {
  ATIVO_PORTFOLIO:  { label: 'Ativo Portfólio',  cor: '#34c97e', badge: 'badge-green',  timer: false },
  ATIVO_TEMPORARIO: { label: 'Ativo Temporário', cor: '#4f8ef7', badge: 'badge-blue',   timer: true  },
  VPE_ATIVO:        { label: 'VPE Ativo',        cor: '#f97316', badge: 'badge-orange', timer: true  },
  VPE_INATIVO:      { label: 'VPE Inativo',      cor: '#6b6b6b', badge: 'badge-gray',   timer: false },
  SUSPENSO:         { label: 'Suspenso',         cor: '#f5a623', badge: 'badge-amber',  timer: false },
  INATIVO:          { label: 'Inativo',          cor: '#f25c6e', badge: 'badge-red',    timer: false },
}

// Calcula quantos dias faltam (negativo = já venceu)
function diasRestantes(timerInicio, timerDias) {
  if (!timerInicio || !timerDias) return null
  const inicio = timerInicio.toDate ? timerInicio.toDate() : new Date(timerInicio)
  const fim = new Date(inicio.getTime() + timerDias * 24 * 60 * 60 * 1000)
  const diffMs = fim.getTime() - Date.now()
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}

export default function Produtos() {
  const { perfil, user } = useAuth()
  const isAdmin = ['SUPER_ADMIN', 'GESTOR_CADASTRO'].includes(perfil?.perfil)

  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'produtos'), snap => {
      setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  // Verifica lembretes VPE ao carregar produtos
  useEffect(() => {
    if (!produtos.length) return
    const perfisQueVerificam = ['SUPER_ADMIN', 'GESTOR_CADASTRO']
    if (!perfisQueVerificam.includes(perfil?.perfil)) return

    async function verificarLembretes() {
      const cfg = await getConfigSistema()
      if (!cfg.lembreteVPE?.ativo) return

      const intervaloDias = cfg.lembreteVPE.intervaloDias || 7
      const agora = Date.now()
      const vpeAtivos = produtos.filter(p => p.estado === 'VPE_ATIVO')

      for (const produto of vpeAtivos) {
        const ultimoMs = produto.ultimoLembreteVPE?.toDate?.()?.getTime()
          || produto.criadoEm?.toDate?.()?.getTime()
          || 0
        const diasPassados = (agora - ultimoMs) / 86_400_000

        if (diasPassados >= intervaloDias) {
          await criarLembreteVPE({ produto, config: cfg })
          await updateDoc(doc(db, 'produtos', produto.codigoCitel), {
            ultimoLembreteVPE: serverTimestamp(),
          })
        }
      }
    }

    verificarLembretes()
  }, [produtos, perfil?.perfil]) // eslint-disable-line react-hooks/exhaustive-deps

  // Produtos com timer vencido (alerta) — calculado no client, sem escrita extra
  const vencidos = produtos.filter(p => {
    if (!ESTADO_CONFIG[p.estado]?.timer) return false
    const dias = diasRestantes(p.timerInicio, p.timerDias)
    return dias !== null && dias <= 0
  })

  const filtrados = produtos.filter(p => {
    const matchBusca =
      p.codigoCitel?.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      p.marca?.toLowerCase().includes(busca.toLowerCase())
    const matchEstado = filtroEstado === 'TODOS' || p.estado === filtroEstado
    return matchBusca && matchEstado
  })

  const contagem = {}
  produtos.forEach(p => { contagem[p.estado] = (contagem[p.estado] || 0) + 1 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>

      {/* HEADER */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5 }}>
          Produtos — Ciclo de Vida
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
          {produtos.length} produto{produtos.length !== 1 ? 's' : ''} cadastrado{produtos.length !== 1 ? 's' : ''}
          {vencidos.length > 0 && ` · ${vencidos.length} com timer vencido`}
        </p>
      </div>

      {/* ALERTA DE TIMERS VENCIDOS */}
      {vencidos.length > 0 && (
        <div style={{
          background: 'rgba(242,92,110,.1)', border: '1px solid rgba(242,92,110,.3)',
          borderRadius: 'var(--radius)', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
              {vencidos.length} produto{vencidos.length > 1 ? 's' : ''} com timer vencido
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Decida: desativar, prorrogar ou promover a portfólio.
            </div>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Buscar por código, descrição ou marca..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFiltroEstado('TODOS')}
            className={filtroEstado === 'TODOS' ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            Todos ({produtos.length})
          </button>
          {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFiltroEstado(key)}
              className={filtroEstado === key ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              {cfg.label} ({contagem[key] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* TABELA */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>
              {produtos.length === 0 ? 'Nenhum produto ainda' : 'Nenhum produto encontrado'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              {produtos.length === 0 && 'Produtos aparecem aqui automaticamente quando uma solicitação é aprovada na Fila.'}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Código CITEL', 'Descrição', 'Estado', 'Timer', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: .5, background: 'var(--surface)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const cfg = ESTADO_CONFIG[p.estado] || {}
                const dias = cfg.timer ? diasRestantes(p.timerInicio, p.timerDias) : null
                const venceu = dias !== null && dias <= 0
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>
                      {p.codigoCitel}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>
                      <div>{p.descricao || '—'}</div>
                      {p.marca && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.marca}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {cfg.timer ? (
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: venceu ? 'var(--red)' : dias <= 5 ? 'var(--amber)' : 'var(--text2)',
                          fontFamily: 'DM Mono, monospace',
                        }}>
                          {venceu ? `Venceu há ${Math.abs(dias)}d` : `${dias}d restantes`}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '5px 10px' }}
                        onClick={() => setProdutoSelecionado(p)}
                      >
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE GERENCIAMENTO */}
      {produtoSelecionado && (
        <ModalProduto
          produto={produtoSelecionado}
          isAdmin={isAdmin}
          onClose={() => setProdutoSelecionado(null)}
        />
      )}
    </div>
  )
}

// ─── MODAL DE GERENCIAMENTO DO PRODUTO ───────────────────────────────────────
function ModalProduto({ produto, isAdmin, onClose }) {
  const { perfil, user } = useAuth()
  const [salvando, setSalvando] = useState(false)
  const [prorrogarDias, setProrrogarDias] = useState(15)

  const cfg = ESTADO_CONFIG[produto.estado] || {}
  const dias = cfg.timer ? diasRestantes(produto.timerInicio, produto.timerDias) : null
  const venceu = dias !== null && dias <= 0

  async function mudarEstado(novoEstado, opcoes = {}) {
    setSalvando(true)
    try {
      const entrada = {
        acao: 'MUDANCA_ESTADO',
        de: produto.estado,
        para: novoEstado,
        responsavel: perfil?.nome || user?.email,
        data: new Date().toISOString(),
      }
      await updateDoc(doc(db, 'produtos', produto.id), {
        estado: novoEstado,
        ativoCompras: ['ATIVO_PORTFOLIO', 'ATIVO_TEMPORARIO', 'VPE_ATIVO'].includes(novoEstado),
        atualizadoEm: serverTimestamp(),
        historico: [...(produto.historico || []), entrada],
        ...opcoes,
      })
      onClose()
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    }
    setSalvando(false)
  }

  function desativar() {
    mudarEstado(produto.estado === 'VPE_ATIVO' ? 'VPE_INATIVO' : 'INATIVO', {
      timerInicio: null, timerDias: null,
    })
  }

  function prorrogar() {
    mudarEstado(produto.estado, {
      timerInicio: serverTimestamp(),
      timerDias: Number(prorrogarDias),
    })
  }

  function promoverPortfolio() {
    mudarEstado('ATIVO_PORTFOLIO', { timerInicio: null, timerDias: null })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 'var(--radius)', width: '100%', maxWidth: 460,
        maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>
              {produto.codigoCitel}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{produto.descricao}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ESTADO ATUAL */}
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Estado atual</span>
            <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
          </div>

          {/* TIMER */}
          {cfg.timer && (
            <div style={{
              background: venceu ? 'rgba(242,92,110,.1)' : 'var(--surface2)',
              border: `1px solid ${venceu ? 'rgba(242,92,110,.3)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', padding: '14px 16px',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Status do timer</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: venceu ? 'var(--red)' : 'var(--text)' }}>
                {venceu ? `Venceu há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}` : `${dias} dia${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''}`}
              </div>
            </div>
          )}

          {/* AÇÕES — só admin */}
          {isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Ações disponíveis</div>

              {cfg.timer && (
                <>
                  <button className="btn btn-danger" onClick={desativar} disabled={salvando}
                    style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
                    ⏹ Desativar agora
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      className="input"
                      value={prorrogarDias}
                      onChange={e => setProrrogarDias(e.target.value)}
                      style={{ flex: 1, cursor: 'pointer' }}
                    >
                      <option value={7}>+7 dias</option>
                      <option value={15}>+15 dias</option>
                      <option value={30}>+30 dias</option>
                      <option value={60}>+60 dias</option>
                    </select>
                    <button className="btn btn-primary" onClick={prorrogar} disabled={salvando}
                      style={{ whiteSpace: 'nowrap' }}>
                      ⏳ Prorrogar
                    </button>
                  </div>

                  <button className="btn btn-success" onClick={promoverPortfolio} disabled={salvando}
                    style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
                    📈 Promover a Portfólio (sem prazo)
                  </button>
                </>
              )}

              {!cfg.timer && produto.estado !== 'INATIVO' && (
                <button className="btn btn-danger" onClick={() => mudarEstado('SUSPENSO')} disabled={salvando}
                  style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
                  ⏸ Suspender produto
                </button>
              )}

              {produto.estado === 'SUSPENSO' && (
                <button className="btn btn-success" onClick={() => mudarEstado('ATIVO_PORTFOLIO')} disabled={salvando}
                  style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
                  ▶ Reativar produto
                </button>
              )}
            </div>
          )}

          {/* HISTÓRICO */}
          {produto.historico?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>Histórico</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {produto.historico.slice().reverse().map((h, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: 'var(--text3)',
                    borderLeft: '2px solid var(--border2)', paddingLeft: 10,
                  }}>
                    <span style={{ color: 'var(--text2)', fontWeight: 600 }}>
                      {h.acao === 'CRIADO' ? 'Produto criado' : `${ESTADO_CONFIG[h.de]?.label || h.de} → ${ESTADO_CONFIG[h.para]?.label || h.para}`}
                    </span>
                    {' '}por {h.responsavel} · {new Date(h.data).toLocaleString('pt-BR')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}