import React, { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { notificarAprovacao, notificarDevolucao, notificarReprovacao, notificarNovaSolicitacao } from '../services/notificacoes.js'

const STATUS_CONFIG = {
  AGUARDANDO:  { label: 'Aguardando',  badge: 'badge-amber',  icon: '⏳' },
  EM_ANALISE:  { label: 'Em Análise',  badge: 'badge-blue',   icon: '🔍' },
  DEVOLVIDA:   { label: 'Devolvida',   badge: 'badge-orange', icon: '↩️' },
  EM_CORRECAO: { label: 'Em Correção', badge: 'badge-amber',  icon: '✏️' },
  APROVADA:    { label: 'Aprovada',    badge: 'badge-green',  icon: '✅' },
  REPROVADA:   { label: 'Reprovada',   badge: 'badge-red',    icon: '❌' },
}

const TIPO_CONFIG = {
  SKU_NOVO:           { label: 'SKU Novo',            cor: 'var(--blue)'   },
  VPE:                { label: 'VPE',                 cor: 'var(--orange)' },
  USO_CONSUMO:        { label: 'Uso e Consumo',       cor: 'var(--amber)'  },
  CORRECAO_CADASTRO:  { label: 'Correção de Cadastro',cor: 'var(--accent)' },
  AJUSTE_ESTOQUE:     { label: 'Ajuste de Estoque',   cor: 'var(--green)'  },
}

export default function Fila() {
  const { perfil, user } = useAuth()
  const [solicitacoes, setSolicitacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const [selecionada, setSelecionada] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [novaSolicitacao, setNovaSolicitacao] = useState(false)

  const isGestor = ['SUPER_ADMIN', 'GESTOR_CADASTRO'].includes(perfil?.perfil)

  useEffect(() => {
    const q = query(collection(db, 'solicitacoes'), orderBy('criadoEm', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setSolicitacoes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  const filtradas = filtroStatus === 'TODOS'
    ? solicitacoes
    : solicitacoes.filter(s => s.status === filtroStatus)

  function tempoNaFila(criadoEm) {
    if (!criadoEm) return '—'
    const diff = Date.now() - criadoEm.toDate().getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (d > 0) return `${d}d ${h % 24}h`
    if (h > 0) return `${h}h`
    return `<1h`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5 }}>
            Fila de Cadastros
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
            {solicitacoes.length} solicitação{solicitacoes.length !== 1 ? 'ões' : ''} no total
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setNovaSolicitacao(true)}
          style={{ gap: 8 }}
        >
          + Nova Solicitação
        </button>
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['TODOS', ...Object.keys(STATUS_CONFIG)].map(s => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: filtroStatus === s ? 'var(--accent)' : 'var(--border2)',
              background: filtroStatus === s ? 'var(--acc-dim)' : 'transparent',
              color: filtroStatus === s ? 'var(--accent)' : 'var(--text3)',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all .15s',
            }}
          >
            {s === 'TODOS' ? 'Todos' : STATUS_CONFIG[s]?.label}
            {s !== 'TODOS' && (
              <span style={{ marginLeft: 6, opacity: .7 }}>
                {solicitacoes.filter(x => x.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TABELA */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            Carregando...
          </div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>
              Nenhuma solicitação encontrada
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['#', 'Tipo', 'Descrição', 'Solicitante', 'Tempo', 'Status', 'Ação'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11, fontWeight: 700,
                    color: 'var(--text3)',
                    textTransform: 'uppercase',
                    letterSpacing: .5,
                    background: 'var(--surface)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((s, i) => (
                <tr key={s.id} style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background .1s',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { setSelecionada(s); setModalAberto(true) }}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text3)' }}>
                    #{String(i + 1).padStart(3, '0')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: TIPO_CONFIG[s.tipo]?.cor || 'var(--text2)',
                      background: 'var(--surface2)',
                      padding: '3px 8px', borderRadius: 4,
                    }}>
                      {TIPO_CONFIG[s.tipo]?.label || s.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', maxWidth: 280 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                      {s.descricao || '—'}
                    </div>
                    {s.marca && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.marca}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>
                    {s.solicitante || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text3)' }}>
                    {tempoNaFila(s.criadoEm)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${STATUS_CONFIG[s.status]?.badge || 'badge-gray'}`}>
                      {STATUS_CONFIG[s.status]?.icon} {STATUS_CONFIG[s.status]?.label || s.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                    {isGestor && s.status === 'AGUARDANDO' && (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '5px 10px' }}
                        onClick={() => { setSelecionada(s); setModalAberto(true) }}
                      >
                        Analisar →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DETALHE */}
      {modalAberto && selecionada && (
        <ModalSolicitacao
          solicitacao={selecionada}
          onClose={() => { setModalAberto(false); setSelecionada(null) }}
          isGestor={isGestor}
          perfil={perfil}
          user={user}
        />
      )}

      {/* MODAL NOVA SOLICITAÇÃO */}
      {novaSolicitacao && (
        <ModalNovaSolicitacao
          onClose={() => setNovaSolicitacao(false)}
          perfil={perfil}
          user={user}
        />
      )}
    </div>
  )
}

// ─── MODAL DETALHE ────────────────────────────────────────────────────────────
function ModalSolicitacao({ solicitacao: s, onClose, isGestor, perfil, user }) {
  const [acao, setAcao] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [codigoCitel, setCodigoCitel] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function executarAcao(tipo) {
    if (tipo === 'DEVOLVER' && !motivo.trim()) return alert('Informe o motivo da devolução.')
    if (tipo === 'REPROVAR' && !motivo.trim()) return alert('Informe o motivo da reprovação.')
    if (tipo === 'APROVAR' && !codigoCitel.trim()) return alert('Informe o código gerado no CITEL.')

    setSalvando(true)
    try {
      const ref = doc(db, 'solicitacoes', s.id)
      const novoStatus = {
        APROVAR:  'APROVADA',
        REPROVAR: 'REPROVADA',
        DEVOLVER: 'DEVOLVIDA',
        ANALISAR: 'EM_ANALISE',
      }[tipo]

      const entrada = {
        acao: tipo,
        status: novoStatus,
        responsavel: perfil?.nome || user?.email,
        data: new Date().toISOString(),
        ...(motivo && { motivo }),
        ...(codigoCitel && { codigoCitel }),
      }

      await updateDoc(ref, {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
        historico: [...(s.historico || []), entrada],
        ...(codigoCitel && { codigoCitel }),
        ...(motivo && { motivoUltimo: motivo }),
      })

      // Ao aprovar, cria automaticamente o produto no ciclo de vida do SKU
      if (tipo === 'APROVAR' && codigoCitel) {
        const ehVPE = s.tipo === 'VPE'
        await setDoc(doc(db, 'produtos', codigoCitel.trim()), {
          codigoCitel:         codigoCitel.trim(),
          descricao:           s.descricao || '',
          marca:               s.marca || '',
          fornecedor:          s.fornecedor || '',
          tipoOrigem:          s.tipo,
          estado:              ehVPE ? 'VPE_ATIVO' : 'ATIVO_PORTFOLIO',
          ativoCompras:        true,
          timerInicio:         ehVPE ? serverTimestamp() : null,
          timerDias:           ehVPE ? 30 : null,
          vendedor:            s.vendedor || null,
          cliente:             s.cliente || null,
          solicitacaoId:       s.id,
          ultimoLembreteVPE:   null,
          criadoEm:            serverTimestamp(),
          atualizadoEm:        serverTimestamp(),
          historico: [{
            acao: 'CRIADO',
            estado: ehVPE ? 'VPE_ATIVO' : 'ATIVO_PORTFOLIO',
            responsavel: perfil?.nome || user?.email,
            data: new Date().toISOString(),
          }],
        }, { merge: true })
        await notificarAprovacao({ solicitacao: { ...s, id: s.id }, codigoCitel: codigoCitel.trim() })
      }

      if (tipo === 'DEVOLVER') {
        await notificarDevolucao({ solicitacao: { ...s, id: s.id }, motivo })
      }

      if (tipo === 'REPROVAR') {
        await notificarReprovacao({ solicitacao: { ...s, id: s.id }, motivo })
      }

      onClose()
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    }
    setSalvando(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius)',
        width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        {/* HEADER MODAL */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Solicitação — {TIPO_CONFIG[s.tipo]?.label || s.tipo}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, fontFamily: 'DM Mono, monospace' }}>
              por {s.solicitante} · {s.criadoEm?.toDate().toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`badge ${STATUS_CONFIG[s.status]?.badge || 'badge-gray'}`}>
              {STATUS_CONFIG[s.status]?.label}
            </span>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'var(--text3)',
              cursor: 'pointer', fontSize: 20, padding: 4,
            }}>×</button>
          </div>
        </div>

        {/* CORPO MODAL */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* CAMPOS */}
          {[
            { label: 'Descrição',   valor: s.descricao },
            { label: 'Marca',       valor: s.marca },
            { label: 'Fornecedor',  valor: s.fornecedor },
            { label: 'NCM',         valor: s.ncm },
            { label: 'Lead Time',   valor: s.leadTime ? `${s.leadTime} dias` : null },
            { label: 'Custo',       valor: s.custo ? `R$ ${s.custo}` : null },
            { label: 'Cód. Barras', valor: s.codigoBarras },
            { label: 'Observações', valor: s.observacoes },
          ].filter(c => c.valor).map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: .5,
                minWidth: 100, paddingTop: 2,
              }}>{c.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{c.valor}</div>
            </div>
          ))}

          {/* CÓDIGO CITEL SE APROVADA */}
          {s.codigoCitel && (
            <div style={{
              background: 'var(--green-dim)',
              border: '1px solid rgba(52,201,126,.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>
                CÓDIGO CITEL
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, color: 'var(--green)', fontWeight: 700 }}>
                {s.codigoCitel}
              </div>
            </div>
          )}

          {/* HISTÓRICO */}
          {s.historico?.length > 0 && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10,
              }}>Histórico</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.historico.map((h, i) => (
                  <div key={i} style={{
                    background: 'var(--surface2)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '10px 14px',
                    fontSize: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{h.responsavel}</span>
                      <span style={{ color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                        {new Date(h.data).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text2)' }}>
                      {h.acao}{h.motivo ? ` — ${h.motivo}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AÇÕES DO GESTOR */}
          {isGestor && !['APROVADA', 'REPROVADA'].includes(s.status) && (
            <div style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 16,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5 }}>
                Ações
              </div>

              {/* APROVAR */}
              {acao === 'APROVAR' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, color: 'var(--text2)' }}>Código gerado no CITEL *</label>
                  <input
                    className="input"
                    placeholder="Ex: 480628"
                    value={codigoCitel}
                    onChange={e => setCodigoCitel(e.target.value)}
                    style={{ fontFamily: 'DM Mono, monospace', fontSize: 16 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-success" disabled={salvando} onClick={() => executarAcao('APROVAR')} style={{ flex: 1, justifyContent: 'center' }}>
                      {salvando ? 'Salvando...' : '✅ Confirmar Aprovação'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setAcao(null)}>Cancelar</button>
                  </div>
                </div>
              )}

              {/* DEVOLVER / REPROVAR */}
              {(acao === 'DEVOLVER' || acao === 'REPROVAR') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {acao === 'DEVOLVER' ? 'Motivo da devolução *' : 'Motivo da reprovação *'}
                  </label>
                  <textarea
                    className="input"
                    placeholder="Descreva o problema ou motivo..."
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={acao === 'DEVOLVER' ? 'btn btn-ghost' : 'btn btn-danger'}
                      disabled={salvando}
                      onClick={() => executarAcao(acao)}
                      style={{ flex: 1, justifyContent: 'center', borderColor: acao === 'DEVOLVER' ? 'var(--orange)' : undefined, color: acao === 'DEVOLVER' ? 'var(--orange)' : undefined }}
                    >
                      {salvando ? 'Salvando...' : acao === 'DEVOLVER' ? '↩️ Confirmar Devolução' : '❌ Confirmar Reprovação'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setAcao(null)}>Cancelar</button>
                  </div>
                </div>
              )}

              {/* BOTÕES PRINCIPAIS */}
              {!acao && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {s.status === 'AGUARDANDO' && (
                    <button className="btn btn-ghost" onClick={() => executarAcao('ANALISAR')}
                      style={{ fontSize: 12, borderColor: 'var(--blue)', color: 'var(--blue)' }}>
                      🔍 Iniciar Análise
                    </button>
                  )}
                  <button className="btn btn-success" onClick={() => setAcao('APROVAR')} style={{ fontSize: 12 }}>
                    ✅ Aprovar
                  </button>
                  <button className="btn btn-ghost" onClick={() => setAcao('DEVOLVER')}
                    style={{ fontSize: 12, borderColor: 'var(--orange)', color: 'var(--orange)' }}>
                    ↩️ Devolver
                  </button>
                  <button className="btn btn-danger" onClick={() => setAcao('REPROVAR')} style={{ fontSize: 12 }}>
                    ❌ Reprovar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MODAL NOVA SOLICITAÇÃO ───────────────────────────────────────────────────
function ModalNovaSolicitacao({ onClose, perfil, user }) {
  const [form, setForm] = useState({
    tipo: 'SKU_NOVO', descricao: '', marca: '', fornecedor: '',
    ncm: '', leadTime: '', custo: '', codigoBarras: '',
    vendedor: '', cliente: '', observacoes: '',
  })
  const [salvando, setSalvando] = useState(false)

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  async function salvar() {
    if (!form.descricao.trim()) return alert('Descrição é obrigatória.')
    if (!form.marca.trim()) return alert('Marca é obrigatória.')
    if (!form.fornecedor.trim()) return alert('Fornecedor é obrigatório.')

    setSalvando(true)
    try {
      const solicitante = perfil?.nome || user?.displayName || 'Usuário'
      const ref = await addDoc(collection(db, 'solicitacoes'), {
        ...form,
        status: 'AGUARDANDO',
        solicitante,
        emailSolicitante: user?.email,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        historico: [{
          acao: 'CRIADA',
          responsavel: perfil?.nome || user?.email,
          data: new Date().toISOString(),
        }],
      })
      await notificarNovaSolicitacao({ solicitacao: { id: ref.id, ...form, solicitante } })
      onClose()
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    }
    setSalvando(false)
  }

  const camposVPE = form.tipo === 'VPE'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius)',
        width: '100%', maxWidth: 580,
        maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            Nova Solicitação
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            cursor: 'pointer', fontSize: 20, padding: 4,
          }}>×</button>
        </div>

        {/* FORM */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* TIPO */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              Tipo de Solicitação *
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(TIPO_CONFIG).map(([key, val]) => (
                <button key={key} onClick={() => set('tipo', key)} style={{
                  padding: '6px 12px', borderRadius: 6,
                  border: '1px solid',
                  borderColor: form.tipo === key ? val.cor : 'var(--border2)',
                  background: form.tipo === key ? 'rgba(255,255,255,.05)' : 'transparent',
                  color: form.tipo === key ? val.cor : 'var(--text3)',
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .15s',
                }}>
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* CAMPOS PRINCIPAIS */}
          {[
            { campo: 'descricao',    label: 'Descrição do Material *', placeholder: 'Ex: Cabo PP 2x1,5mm 100m' },
            { campo: 'marca',        label: 'Marca *',                  placeholder: 'Ex: Prysmian' },
            { campo: 'fornecedor',   label: 'Fornecedor *',             placeholder: 'Ex: Elétrica Silva' },
            { campo: 'ncm',          label: 'NCM',                      placeholder: 'Ex: 85444900' },
            { campo: 'leadTime',     label: 'Lead Time (dias)',          placeholder: 'Ex: 7', tipo: 'number' },
            { campo: 'custo',        label: 'Custo Final (R$)',          placeholder: 'Ex: 45.90', tipo: 'number' },
            { campo: 'codigoBarras', label: 'Código de Barras (EAN)',    placeholder: 'Ex: 7891234567890' },
          ].map(({ campo, label, placeholder, tipo }) => (
            <div key={campo}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                {label}
              </label>
              <input
                className="input"
                type={tipo || 'text'}
                placeholder={placeholder}
                value={form[campo]}
                onChange={e => set(campo, e.target.value)}
              />
            </div>
          ))}

          {/* CAMPOS VPE */}
          {camposVPE && (
            <>
              {[
                { campo: 'vendedor', label: 'Vendedor Solicitante *', placeholder: 'Nome do vendedor' },
                { campo: 'cliente',  label: 'Cliente Solicitante *',  placeholder: 'Nome do cliente' },
              ].map(({ campo, label, placeholder }) => (
                <div key={campo}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange)', display: 'block', marginBottom: 6 }}>
                    {label}
                  </label>
                  <input className="input" placeholder={placeholder} value={form[campo]} onChange={e => set(campo, e.target.value)} />
                </div>
              ))}
            </>
          )}

          {/* OBSERVAÇÕES */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              Observações
            </label>
            <textarea
              className="input"
              placeholder="Informações adicionais..."
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* BOTÕES */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}
              style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
              {salvando ? 'Enviando...' : '📋 Enviar Solicitação'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}