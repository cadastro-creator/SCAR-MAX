import React, { useState, useEffect } from 'react'
import {
  collection, onSnapshot, doc, setDoc, updateDoc,
  addDoc, deleteDoc, getDocs, query, orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const PERFIS = [
  { value: 'SUPER_ADMIN',       label: 'Super Admin'        },
  { value: 'GESTOR_CADASTRO',   label: 'Gestor de Cadastro' },
  { value: 'COMPRADOR',         label: 'Comprador'          },
  { value: 'FISCAL',            label: 'Fiscal'             },
  { value: 'GERENTE_COMERCIAL', label: 'Gerente Comercial'  },
  { value: 'ALMOXARIFADO',      label: 'Almoxarifado'       },
  { value: 'RECEBIMENTO',       label: 'Recebimento'        },
  { value: 'GARANTIAS',         label: 'Garantias'          },
]

const PERFIL_CORES = {
  SUPER_ADMIN:       'badge-orange',
  GESTOR_CADASTRO:   'badge-blue',
  COMPRADOR:         'badge-green',
  FISCAL:            'badge-amber',
  GERENTE_COMERCIAL: 'badge-blue',
  ALMOXARIFADO:      'badge-gray',
  RECEBIMENTO:       'badge-gray',
  GARANTIAS:         'badge-gray',
}

// ─── ABA SELECTOR ─────────────────────────────────────────────────────────────
function Aba({ id, label, ativa, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        background: 'none', border: 'none',
        borderBottom: ativa ? '2px solid var(--accent)' : '2px solid transparent',
        color: ativa ? 'var(--accent)' : 'var(--text3)',
        padding: '10px 4px',
        marginRight: 20,
        fontSize: 13, fontWeight: 600,
        cursor: 'pointer',
        transition: 'all .15s',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ─── MODAL CONVITE ─────────────────────────────────────────────────────────────
function ModalConvite({ convite, onClose, onSalvo, nomeAdmin }) {
  const isEdicao = !!convite
  const [form, setForm] = useState({
    nome:   convite?.nome   || '',
    email:  convite?.email  || '',
    perfil: convite?.perfil || 'COMPRADOR',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const set = (campo, valor) => { setForm(f => ({ ...f, [campo]: valor })); setErro('') }

  async function salvar() {
    if (!form.nome.trim())  return setErro('Nome é obrigatório.')
    if (!form.email.trim() || !form.email.includes('@')) return setErro('Informe um e-mail válido.')

    setSalvando(true)
    try {
      if (isEdicao) {
        await updateDoc(doc(db, 'convites', convite.id), {
          nome:   form.nome.trim(),
          perfil: form.perfil,
        })
      } else {
        await addDoc(collection(db, 'convites'), {
          nome:          form.nome.trim(),
          email:         form.email.trim().toLowerCase(),
          perfil:        form.perfil,
          usado:         false,
          convidadoPor:  nomeAdmin || 'Admin',
          criadoEm:      serverTimestamp(),
        })
      }
      onSalvo()
      onClose()
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
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
        width: '100%', maxWidth: 460,
      }} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {isEdicao ? 'Editar Convite' : 'Convidar Pessoa'}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: 'var(--text3)', cursor: 'pointer', fontSize: 20,
          }}>×</button>
        </div>

        {/* FORM */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* NOME */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              Nome *
            </label>
            <input
              className="input"
              placeholder="Ex: Everton Silva"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
            />
          </div>

          {/* EMAIL */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              E-mail Google *
            </label>
            <input
              className="input"
              type="email"
              placeholder="exemplo@contattos.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              disabled={isEdicao}
              style={isEdicao ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              Deve ser o e-mail da conta Google que a pessoa usará para acessar.
            </div>
          </div>

          {/* PERFIL */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              Perfil de acesso *
            </label>
            <select
              className="input"
              value={form.perfil}
              onChange={e => set('perfil', e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {PERFIS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* PREVIEW PERFIL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Acesso como:</span>
            <span className={`badge ${PERFIL_CORES[form.perfil] || 'badge-gray'}`}>
              {form.perfil}
            </span>
          </div>

          {/* ERRO */}
          {erro && (
            <div style={{
              background: 'var(--red-dim)', color: 'var(--red)',
              border: '1px solid rgba(242,92,110,.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', fontSize: 12,
            }}>
              {erro}
            </div>
          )}

          {/* BOTÕES */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button
              className="btn btn-primary"
              onClick={salvar}
              disabled={salvando}
              style={{ flex: 1, justifyContent: 'center', padding: 12 }}
            >
              {salvando ? 'Salvando...' : isEdicao ? '💾 Atualizar' : '✉️ Enviar Convite'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL EDITAR USUÁRIO ──────────────────────────────────────────────────────
function ModalUsuario({ usuario, onClose }) {
  const [form, setForm] = useState({
    nome:   usuario?.nome   || '',
    email:  usuario?.email  || '',
    perfil: usuario?.perfil || 'COMPRADOR',
    ativo:  usuario?.ativo !== undefined ? usuario.ativo : true,
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  async function salvar() {
    if (!form.nome.trim()) return setErro('Nome é obrigatório.')
    setSalvando(true)
    setErro('')
    try {
      await setDoc(doc(db, 'usuarios', usuario.id), {
        nome:         form.nome.trim(),
        email:        form.email.trim().toLowerCase(),
        perfil:       form.perfil,
        ativo:        form.ativo,
        atualizadoEm: serverTimestamp(),
      }, { merge: true })
      onClose()
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
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
        width: '100%', maxWidth: 460,
      }} onClick={e => e.stopPropagation()}>

        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            Editar — {usuario.nome}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20,
          }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Nome *</label>
            <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Email</label>
            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Perfil *</label>
            <select className="input" value={form.perfil} onChange={e => set('perfil', e.target.value)} style={{ cursor: 'pointer' }}>
              {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {/* ATIVO toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '12px 16px',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Usuário ativo</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Usuários inativos não conseguem fazer login</div>
            </div>
            <div onClick={() => set('ativo', !form.ativo)} style={{
              width: 44, height: 24, borderRadius: 12,
              background: form.ativo ? 'var(--accent)' : 'var(--surface3)',
              position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 3, left: form.ativo ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left .2s',
              }} />
            </div>
          </div>

          {erro && (
            <div style={{
              background: 'var(--red-dim)', color: 'var(--red)',
              border: '1px solid rgba(242,92,110,.3)',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 12,
            }}>{erro}</div>
          )}

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}
              style={{ flex: 1, justifyContent: 'center', padding: 12 }}>
              {salvando ? 'Salvando...' : '💾 Salvar Alterações'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function Usuarios() {
  const { perfil: perfilAtual } = useAuth()
  const isAdmin = ['SUPER_ADMIN', 'GESTOR_CADASTRO'].includes(perfilAtual?.perfil)

  const [aba, setAba]               = useState('usuarios')
  const [usuarios, setUsuarios]     = useState([])
  const [convites, setConvites]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [busca, setBusca]           = useState('')

  const [modalConvite, setModalConvite]         = useState(false)
  const [conviteEditando, setConviteEditando]   = useState(null)
  const [usuarioEditando, setUsuarioEditando]   = useState(null)

  // Usuários em tempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  // Convites (carrega uma vez e recarrega ao salvar)
  async function carregarConvites() {
    try {
      const snap = await getDocs(query(collection(db, 'convites'), orderBy('criadoEm', 'desc')))
      setConvites(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { carregarConvites() }, [])

  async function toggleAtivo(u) {
    await updateDoc(doc(db, 'usuarios', u.id), {
      ativo: !u.ativo, atualizadoEm: serverTimestamp(),
    })
  }

  async function excluirConvite(id) {
    if (!confirm('Cancelar este convite?')) return
    await deleteDoc(doc(db, 'convites', id))
    carregarConvites()
  }

  const filtrados = usuarios.filter(u =>
    u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase()) ||
    u.perfil?.toLowerCase().includes(busca.toLowerCase())
  )

  const convitesPendentes = convites.filter(c => !c.usado)
  const convitesUsados    = convites.filter(c => c.usado)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5 }}>
            Usuários
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
            {usuarios.filter(u => u.ativo).length} ativos
            {convitesPendentes.length > 0 && ` · ${convitesPendentes.length} convite${convitesPendentes.length > 1 ? 's' : ''} pendente${convitesPendentes.length > 1 ? 's' : ''}`}
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => { setConviteEditando(null); setModalConvite(true) }}
          >
            ✉️ Convidar Pessoa
          </button>
        )}
      </div>

      {/* ABAS */}
      <div style={{ borderBottom: '1px solid var(--border)', display: 'flex' }}>
        <Aba id="usuarios" label={`Usuários (${usuarios.length})`} ativa={aba === 'usuarios'} onClick={setAba} />
        <Aba id="convites" label={`Convites${convitesPendentes.length > 0 ? ` · ${convitesPendentes.length} pendente${convitesPendentes.length > 1 ? 's' : ''}` : ''}`} ativa={aba === 'convites'} onClick={setAba} />
      </div>

      {/* ── ABA USUÁRIOS ── */}
      {aba === 'usuarios' && (
        <>
          <input
            className="input"
            placeholder="Buscar por nome, email ou perfil..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ maxWidth: 360 }}
          />

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Carregando...</div>
            ) : filtrados.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text3)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>Nenhum usuário encontrado</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Usuário', 'Email', 'Perfil', 'Status', 'Ações'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                        textTransform: 'uppercase', letterSpacing: .5,
                        background: 'var(--surface)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(u => (
                    <tr key={u.id} style={{
                      borderBottom: '1px solid var(--border)',
                      opacity: u.ativo ? 1 : 0.5,
                    }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: u.ativo ? 'var(--acc-dim)' : 'var(--surface2)',
                            border: `1px solid ${u.ativo ? 'rgba(249,115,22,.25)' : 'var(--border2)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700,
                            color: u.ativo ? 'var(--accent)' : 'var(--text3)',
                            flexShrink: 0,
                          }}>
                            {(u.nome || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.nome}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                              UID: {u.id.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>
                        {u.email || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>não definido</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${PERFIL_CORES[u.perfil] || 'badge-gray'}`}>{u.perfil}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${u.ativo ? 'badge-green' : 'badge-red'}`}>
                          {u.ativo ? '● Ativo' : '○ Inativo'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: 11, padding: '5px 10px' }}
                              onClick={() => setUsuarioEditando(u)}
                            >
                              Editar
                            </button>
                            <button
                              className={`btn ${u.ativo ? 'btn-danger' : 'btn-success'}`}
                              style={{ fontSize: 11, padding: '5px 10px' }}
                              onClick={() => toggleAtivo(u)}
                            >
                              {u.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── ABA CONVITES ── */}
      {aba === 'convites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {convites.length === 0 ? (
            <div style={{
              padding: '60px 20px', textAlign: 'center',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
                Nenhum convite enviado ainda
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
                Convide pessoas pelo e-mail da conta Google delas.
              </div>
              {isAdmin && (
                <button
                  className="btn btn-primary"
                  onClick={() => { setConviteEditando(null); setModalConvite(true) }}
                >
                  ✉️ Convidar Pessoa
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Pendentes */}
              {convitesPendentes.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
                  }}>
                    Aguardando primeiro acesso ({convitesPendentes.length})
                  </div>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Nome', 'E-mail', 'Perfil', 'Convidado por', 'Ações'].map(h => (
                            <th key={h} style={{
                              padding: '12px 16px', textAlign: 'left',
                              fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                              textTransform: 'uppercase', letterSpacing: .5,
                              background: 'var(--surface)',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {convitesPendentes.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                              {c.nome}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)', fontFamily: 'DM Mono, monospace' }}>
                              {c.email}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span className={`badge ${PERFIL_CORES[c.perfil] || 'badge-gray'}`}>{c.perfil}</span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)' }}>
                              {c.convidadoPor || '—'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {isAdmin && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    className="btn btn-ghost"
                                    style={{ fontSize: 11, padding: '5px 10px' }}
                                    onClick={() => { setConviteEditando(c); setModalConvite(true) }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    style={{ fontSize: 11, padding: '5px 10px' }}
                                    onClick={() => excluirConvite(c.id)}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Aceitos */}
              {convitesUsados.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
                  }}>
                    Aceitos ({convitesUsados.length})
                  </div>
                  <div className="card" style={{ padding: 0, overflow: 'hidden', opacity: 0.6 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {convitesUsados.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                              {c.nome}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)', fontFamily: 'DM Mono, monospace' }}>
                              {c.email}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span className={`badge ${PERFIL_CORES[c.perfil] || 'badge-gray'}`}>{c.perfil}</span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span className="badge badge-green">✓ Aceito</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* INFO */}
          <div style={{
            background: 'var(--acc-dim)',
            border: '1px solid rgba(249,115,22,.2)',
            borderRadius: 'var(--radius)',
            padding: '14px 18px',
            fontSize: 12, color: 'var(--text2)', lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--accent)' }}>ℹ️ Como funciona:</strong><br />
            Adicione o e-mail Google da pessoa e o perfil desejado. Na primeira vez que ela fizer login, o acesso será criado automaticamente. Quem não tiver convite verá uma tela de acesso negado.
          </div>
        </div>
      )}

      {/* MODAIS */}
      {modalConvite && (
        <ModalConvite
          convite={conviteEditando}
          nomeAdmin={perfilAtual?.nome}
          onClose={() => { setModalConvite(false); setConviteEditando(null) }}
          onSalvo={carregarConvites}
        />
      )}
      {usuarioEditando && (
        <ModalUsuario
          usuario={usuarioEditando}
          onClose={() => setUsuarioEditando(null)}
        />
      )}
    </div>
  )
}