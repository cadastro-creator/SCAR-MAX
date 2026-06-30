import { useState, useEffect } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { getConfigSistema, getConfigPadrao, enviarAppsScript } from '../services/notificacoes'

// ─── Constantes ──────────────────────────────────────────────────────────────

const PERFIS_LABEL = {
  SUPER_ADMIN:       'Super Admin',
  GESTOR_CADASTRO:   'Gestor de Cadastro',
  COMPRADOR:         'Comprador',
  FISCAL:            'Fiscal',
  GERENTE_COMERCIAL: 'Gerente Comercial',
  ALMOXARIFADO:      'Almoxarifado',
  RECEBIMENTO:       'Recebimento',
  GARANTIAS:         'Garantias',
}

const PERFIS_PERMISSAO = [
  'GESTOR_CADASTRO', 'COMPRADOR', 'FISCAL',
  'GERENTE_COMERCIAL', 'ALMOXARIFADO', 'RECEBIMENTO', 'GARANTIAS',
]

const ACOES = [
  { key: 'criarSolicitacao',    label: 'Criar solicitação',     desc: 'Abrir novas solicitações na fila' },
  { key: 'aprovar',             label: 'Aprovar',               desc: 'Aprovar solicitações e registrar cód. CITEL' },
  { key: 'devolver',            label: 'Devolver',              desc: 'Devolver para correção' },
  { key: 'reprovar',            label: 'Reprovar',              desc: 'Reprovar definitivamente' },
  { key: 'editarProduto',       label: 'Editar produto',        desc: 'Alterar estado no ciclo de vida' },
  { key: 'verRelatorios',       label: 'Ver relatórios',        desc: 'Acesso ao Painel NEXUS' },
  { key: 'gerenciarUsuarios',   label: 'Gerenciar usuários',    desc: 'Convidar, editar e desativar' },
  { key: 'acessarConfiguracoes',label: 'Configurações',         desc: 'Acessar esta tela' },
]

const EVENTOS_CHAT = [
  { key: 'APROVACAO',    label: 'Aprovação' },
  { key: 'DEVOLUCAO',   label: 'Devolução' },
  { key: 'REPROVACAO',  label: 'Reprovação' },
  { key: 'LEMBRETE_VPE',label: 'Lembrete VPE' },
]

const EVENTOS_INAPP = [
  { key: 'solicitacaoAprovada',  label: 'Aprovação',               desc: 'Notifica comprador + fiscal + gerência' },
  { key: 'solicitacaoDevolvida', label: 'Devolução',               desc: 'Notifica o comprador solicitante' },
  { key: 'solicitacaoReprovada', label: 'Reprovação',              desc: 'Notifica o comprador solicitante' },
  { key: 'novoCadastroFiscal',   label: 'Novo cadastro → Fiscal',  desc: 'Lembra o fiscal de conferir tributação' },
  { key: 'novoCadastroGerencia', label: 'Novo cadastro → Gerência',desc: 'Lembra o gerente de conferir precificação' },
  { key: 'lembreteVPE',          label: 'Lembrete VPE',            desc: 'Recorrente — intervalo configurado abaixo' },
]

// ─── Utilitários ─────────────────────────────────────────────────────────────

function setDeep(obj, path, value) {
  const keys = path.split('.')
  const result = { ...obj }
  let cur = result
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...(cur[keys[i]] || {}) }
    cur = cur[keys[i]]
  }
  cur[keys[keys.length - 1]] = value
  return result
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: value ? '#f97316' : '#2a2a2a',
        position: 'relative', transition: 'background .2s', flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
      aria-checked={value}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: value ? 23 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left .2s',
      }} />
    </button>
  )
}

function SecTitle({ children }) {
  return (
    <h3 style={{
      color: '#f97316', fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.08em',
      margin: '0 0 18px',
    }}>
      {children}
    </h3>
  )
}

function Row({ label, desc, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '13px 0',
      borderBottom: last ? 'none' : '1px solid #1f1f1f',
    }}>
      <div style={{ paddingRight: 16 }}>
        <div style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ color: '#555', fontSize: 12, marginTop: 3 }}>{desc}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

function TagBtn({ ativo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 13px', borderRadius: 7, fontSize: 12,
        border: `1px solid ${ativo ? '#f97316' : '#2a2a2a'}`,
        background: ativo ? 'rgba(249,115,22,.12)' : 'transparent',
        color: ativo ? '#f97316' : '#555', cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Configuracoes() {
  const { user } = useAuth()
  const [tab, setTab] = useState('notificacoes')
  const [config, setConfig] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testando, setTestando] = useState(false)

  useEffect(() => {
    getConfigSistema().then(cfg => setConfig(cfg))
  }, [])

  function set(path, value) {
    setConfig(prev => setDeep({ ...prev }, path, value))
  }

  async function salvar() {
    setSaving(true)
    try {
      await setDoc(doc(db, 'configuracoes', 'sistema'), config)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function testarEmail() {
    const url = config?.notificacoes?.email?.appsScriptUrl
    if (!url) return
    setTestando(true)
    await enviarAppsScript(url, {
      acao: 'email',
      para: user?.email || 'cadastro@contattos.com',
      assunto: '[NEXUS] Teste de e-mail',
      corpo: 'E-mail de teste do NEXUS MAX. Integração com Apps Script funcionando ✅',
    })
    setTestando(false)
    alert(`Solicitação enviada ao Apps Script — verifique ${user?.email} em instantes.`)
  }

  // Espaços Google Chat
  function adicionarEspaco() {
    const novo = { id: Date.now().toString(), nome: '', webhook: '', eventos: ['APROVACAO'] }
    set('notificacoes.chat.espacos', [...(config?.notificacoes?.chat?.espacos || []), novo])
  }

  function atualizarEspaco(id, campo, valor) {
    set(
      'notificacoes.chat.espacos',
      (config?.notificacoes?.chat?.espacos || []).map(e =>
        e.id === id ? { ...e, [campo]: valor } : e
      )
    )
  }

  function removerEspaco(id) {
    set(
      'notificacoes.chat.espacos',
      (config?.notificacoes?.chat?.espacos || []).filter(e => e.id !== id)
    )
  }

  function toggleEventoEspaco(id, evento) {
    set(
      'notificacoes.chat.espacos',
      (config?.notificacoes?.chat?.espacos || []).map(e => {
        if (e.id !== id) return e
        const ev = e.eventos || []
        return { ...e, eventos: ev.includes(evento) ? ev.filter(x => x !== evento) : [...ev, evento] }
      })
    )
  }

  function togglePermissao(acao, perfil) {
    const atual = config?.permissoes?.[acao] || []
    set(
      `permissoes.${acao}`,
      atual.includes(perfil) ? atual.filter(p => p !== perfil) : [...atual, perfil]
    )
  }

  function togglePerfilVPE(perfil) {
    const atual = config?.lembreteVPE?.perfisAlerta || []
    set(
      'lembreteVPE.perfisAlerta',
      atual.includes(perfil) ? atual.filter(p => p !== perfil) : [...atual, perfil]
    )
  }

  if (!config) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#555', fontSize: 14 }}>
        Carregando configurações…
      </div>
    )
  }

  const n = config.notificacoes
  const temAppsScript = !!n.email?.appsScriptUrl
  const temEspacos = (n.chat?.espacos || []).length > 0

  return (
    <div style={{ maxWidth: 860, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Configurações</h1>
          <p style={{ color: '#555', margin: '4px 0 0', fontSize: 14 }}>
            Notificações, integrações e permissões do sistema
          </p>
        </div>
        <button
          onClick={salvar}
          disabled={saving}
          className="btn btn-primary"
          style={{ minWidth: 110, flexShrink: 0 }}
        >
          {saving ? 'Salvando…' : saved ? '✓ Salvo' : 'Salvar alterações'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #1f1f1f', marginBottom: 28 }}>
        {[
          { key: 'notificacoes', label: 'Notificações' },
          { key: 'integracoes',  label: 'Integrações' },
          { key: 'permissoes',   label: 'Permissões' },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '9px 20px', fontSize: 14,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#f97316' : '#666',
              borderBottom: `2px solid ${tab === t.key ? '#f97316' : 'transparent'}`,
              marginBottom: -1, transition: 'color .15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Notificações ── */}
      {tab === 'notificacoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Canais */}
          <div className="card" style={{ padding: 24 }}>
            <SecTitle>Canais ativos</SecTitle>
            <Row label="In-app (sino)" desc="Funciona enquanto o app estiver aberto no navegador">
              <Toggle value={n.inApp?.ativo ?? true} onChange={v => set('notificacoes.inApp.ativo', v)} />
            </Row>
            <Row
              label="E-mail"
              desc={!temAppsScript ? 'Configure a URL do Apps Script na aba Integrações primeiro' : 'Envio via Google Apps Script'}
            >
              <Toggle
                value={n.email?.ativo ?? false}
                onChange={v => set('notificacoes.email.ativo', v)}
                disabled={!temAppsScript}
              />
            </Row>
            <Row
              label="Google Chat"
              desc={!temEspacos ? 'Adicione ao menos um espaço na aba Integrações' : `${(n.chat?.espacos || []).length} espaço(s) configurado(s)`}
              last
            >
              <Toggle
                value={n.chat?.ativo ?? false}
                onChange={v => set('notificacoes.chat.ativo', v)}
                disabled={!temEspacos}
              />
            </Row>
          </div>

          {/* Eventos in-app */}
          <div className="card" style={{ padding: 24 }}>
            <SecTitle>Eventos — in-app</SecTitle>
            {EVENTOS_INAPP.map((ev, i) => (
              <Row key={ev.key} label={ev.label} desc={ev.desc} last={i === EVENTOS_INAPP.length - 1}>
                <Toggle
                  value={n.inApp?.eventos?.[ev.key] ?? true}
                  onChange={v => set(`notificacoes.inApp.eventos.${ev.key}`, v)}
                  disabled={!n.inApp?.ativo}
                />
              </Row>
            ))}
          </div>

          {/* Obrigatoriedades */}
          <div className="card" style={{ padding: 24 }}>
            <SecTitle>Obrigatoriedades</SecTitle>
            <Row
              label="Exigir verificação do fiscal"
              desc="Comprador só recebe notificação após fiscal confirmar a conferência tributária"
            >
              <Toggle
                value={n.obrigatoriedades?.exigirVerificacaoFiscal ?? false}
                onChange={v => set('notificacoes.obrigatoriedades.exigirVerificacaoFiscal', v)}
              />
            </Row>
            <Row
              label="Exigir verificação da gerência"
              desc="Comprador só recebe notificação após gerente confirmar precificação e margem"
              last
            >
              <Toggle
                value={n.obrigatoriedades?.exigirVerificacaoGerencia ?? false}
                onChange={v => set('notificacoes.obrigatoriedades.exigirVerificacaoGerencia', v)}
              />
            </Row>
          </div>

          {/* Lembrete VPE */}
          <div className="card" style={{ padding: 24 }}>
            <SecTitle>Lembrete VPE</SecTitle>
            <Row label="Ativo" desc="Lembrete recorrente para produtos VPE sem ação">
              <Toggle
                value={config.lembreteVPE?.ativo ?? true}
                onChange={v => set('lembreteVPE.ativo', v)}
              />
            </Row>
            <Row label="Intervalo" desc="Dias entre cada lembrete">
              <input
                type="number" min={1} max={90}
                value={config.lembreteVPE?.intervaloDias ?? 7}
                onChange={e => set('lembreteVPE.intervaloDias', parseInt(e.target.value) || 7)}
                className="input"
                style={{ width: 72, textAlign: 'center', fontFamily: 'DM Mono' }}
              />
              <span style={{ color: '#555', fontSize: 13 }}>dias</span>
            </Row>
            <div style={{ paddingTop: 14 }}>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 10 }}>Quem recebe o lembrete:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['GESTOR_CADASTRO','GERENTE_COMERCIAL','COMPRADOR','FISCAL'].map(p => (
                  <TagBtn
                    key={p}
                    ativo={(config.lembreteVPE?.perfisAlerta || []).includes(p)}
                    onClick={() => togglePerfilVPE(p)}
                  >
                    {PERFIS_LABEL[p]}
                  </TagBtn>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Integrações ── */}
      {tab === 'integracoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Apps Script */}
          <div className="card" style={{ padding: 24 }}>
            <SecTitle>E-mail — Google Apps Script</SecTitle>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
              Crie um Apps Script no Workspace, publique como <strong style={{ color: '#aaa' }}>Web App</strong> e cole a URL abaixo.
              O mesmo script processa e-mails (<code style={{ fontFamily: 'DM Mono', color: '#f97316' }}>acao: "email"</code>)
              e encaminha mensagens ao webhook do Google Chat (<code style={{ fontFamily: 'DM Mono', color: '#f97316' }}>acao: "chat"</code>).
            </p>

            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>URL do Web App</label>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/…/exec"
              value={n.email?.appsScriptUrl || ''}
              onChange={e => set('notificacoes.email.appsScriptUrl', e.target.value)}
              className="input"
              style={{ width: '100%', fontFamily: 'DM Mono', fontSize: 12, marginBottom: 14 }}
            />

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={testarEmail}
                disabled={testando || !temAppsScript}
                className="btn btn-secondary"
                style={{ fontSize: 13 }}
              >
                {testando ? 'Enviando…' : '✉ Enviar e-mail de teste'}
              </button>
              {!temAppsScript && (
                <span style={{ color: '#444', fontSize: 13 }}>Informe a URL para testar</span>
              )}
            </div>

            {/* Matriz eventos × destinatários (email) */}
            {temAppsScript && (
              <div style={{ marginTop: 28 }}>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 14 }}>
                  Enviar e-mail para cada perfil quando:
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:'left', color:'#555', fontWeight:500, padding:'8px 0', borderBottom:'1px solid #1f1f1f', minWidth:160 }}>Evento</th>
                        {['Comprador','Fiscal','Gerência','Gestor'].map(h => (
                          <th key={h} style={{ color:'#555', fontWeight:500, padding:'8px 16px', borderBottom:'1px solid #1f1f1f', textAlign:'center' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key:'solicitacaoAprovada', label:'Aprovação',    cols:['comprador','fiscal','gerenteComercial',null] },
                        { key:'solicitacaoDevolvida',label:'Devolução',    cols:['comprador',null,null,null] },
                        { key:'solicitacaoReprovada',label:'Reprovação',   cols:['comprador',null,null,null] },
                        { key:'lembreteVPE',          label:'Lembrete VPE',cols:[null,null,'gerenteComercial','gestorCadastro'] },
                      ].map(ev => (
                        <tr key={ev.key}>
                          <td style={{ color:'#ccc', padding:'10px 0', borderBottom:'1px solid #181818' }}>{ev.label}</td>
                          {ev.cols.map((col, i) => (
                            <td key={i} style={{ textAlign:'center', padding:'10px 16px', borderBottom:'1px solid #181818' }}>
                              {col
                                ? <input
                                    type="checkbox"
                                    checked={n.email?.eventos?.[ev.key]?.[col] ?? false}
                                    onChange={e => set(`notificacoes.email.eventos.${ev.key}.${col}`, e.target.checked)}
                                    style={{ width:16, height:16, accentColor:'#f97316', cursor:'pointer' }}
                                  />
                                : <span style={{ color:'#2a2a2a' }}>—</span>
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Google Chat */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 18 }}>
              <SecTitle>Google Chat</SecTitle>
              <button onClick={adicionarEspaco} className="btn btn-secondary" style={{ fontSize:13 }}>
                + Adicionar espaço
              </button>
            </div>

            {!temEspacos ? (
              <div style={{ textAlign:'center', padding:'36px 0', color:'#444' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>💬</div>
                <div style={{ fontSize:14, color:'#666' }}>Nenhum espaço configurado.</div>
                <div style={{ fontSize:13, color:'#444', marginTop:6 }}>
                  Crie um espaço no Google Chat → gere o webhook → adicione aqui.
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {(n.chat?.espacos || []).map(espaco => (
                  <div key={espaco.id} style={{ background:'#1a1a1a', borderRadius:10, padding:18 }}>
                    <div style={{ display:'flex', gap:12, marginBottom:12 }}>
                      <div style={{ flex:1 }}>
                        <label style={{ color:'#666', fontSize:11, display:'block', marginBottom:5 }}>Nome do espaço</label>
                        <input
                          type="text"
                          placeholder="Ex: Cadastros — Contattos"
                          value={espaco.nome}
                          onChange={e => atualizarEspaco(espaco.id, 'nome', e.target.value)}
                          className="input"
                          style={{ width:'100%' }}
                        />
                      </div>
                      <button
                        onClick={() => removerEspaco(espaco.id)}
                        style={{
                          background:'rgba(242,92,110,.08)', border:'1px solid rgba(242,92,110,.25)',
                          color:'#f25c6e', borderRadius:8, padding:'0 14px', cursor:'pointer',
                          fontSize:13, alignSelf:'flex-end', height:38,
                        }}
                      >
                        Remover
                      </button>
                    </div>

                    <div style={{ marginBottom:14 }}>
                      <label style={{ color:'#666', fontSize:11, display:'block', marginBottom:5 }}>URL do Webhook</label>
                      <input
                        type="url"
                        placeholder="https://chat.googleapis.com/v1/spaces/…"
                        value={espaco.webhook}
                        onChange={e => atualizarEspaco(espaco.id, 'webhook', e.target.value)}
                        className="input"
                        style={{ width:'100%', fontFamily:'DM Mono', fontSize:12 }}
                      />
                    </div>

                    <div>
                      <label style={{ color:'#666', fontSize:11, display:'block', marginBottom:8 }}>
                        Eventos que disparam neste espaço
                      </label>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {EVENTOS_CHAT.map(ev => (
                          <TagBtn
                            key={ev.key}
                            ativo={(espaco.eventos || []).includes(ev.key)}
                            onClick={() => toggleEventoEspaco(espaco.id, ev.key)}
                          >
                            {ev.label}
                          </TagBtn>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {temEspacos && (
              <div style={{ marginTop:16, padding:12, background:'rgba(79,142,247,.05)', borderRadius:8, border:'1px solid rgba(79,142,247,.12)' }}>
                <p style={{ color:'#4f8ef7', fontSize:12, margin:0, lineHeight:1.7 }}>
                  💡 O envio ao Google Chat passa pelo Apps Script configurado acima — a URL do Web App deve estar preenchida.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Permissões ── */}
      {tab === 'permissoes' && (
        <div className="card" style={{ padding: 24 }}>
          <SecTitle>Permissões por perfil</SecTitle>
          <p style={{ color:'#555', fontSize:13, marginBottom:22 }}>
            SUPER_ADMIN sempre tem acesso total e não pode ser restringido.
          </p>
          <div style={{ overflowX:'auto' }}>
            <table style={{ borderCollapse:'collapse', fontSize:13, width:'100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left', color:'#666', fontWeight:500, padding:'8px 0', borderBottom:'1px solid #1f1f1f', minWidth:200 }}>Ação</th>
                  <th style={{ color:'#f97316', fontWeight:700, padding:'8px 14px', borderBottom:'1px solid #1f1f1f', fontSize:11 }}>SA</th>
                  {PERFIS_PERMISSAO.map(p => (
                    <th key={p} style={{ color:'#555', fontWeight:500, padding:'8px 14px', borderBottom:'1px solid #1f1f1f', fontSize:11, whiteSpace:'nowrap' }}>
                      {PERFIS_LABEL[p]?.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACOES.map(acao => (
                  <tr key={acao.key}>
                    <td style={{ padding:'11px 0', borderBottom:'1px solid #181818' }}>
                      <div style={{ color:'#ccc', fontWeight:500 }}>{acao.label}</div>
                      <div style={{ color:'#444', fontSize:11, marginTop:2 }}>{acao.desc}</div>
                    </td>
                    {/* SUPER_ADMIN — sempre bloqueado/ativo */}
                    <td style={{ textAlign:'center', padding:'11px 14px', borderBottom:'1px solid #181818' }}>
                      <span title="Sempre ativo" style={{ color:'#f97316', fontSize:14 }}>🔒</span>
                    </td>
                    {PERFIS_PERMISSAO.map(perfil => {
                      const tem = (config.permissoes?.[acao.key] || []).includes(perfil)
                      return (
                        <td key={perfil} style={{ textAlign:'center', padding:'11px 14px', borderBottom:'1px solid #181818' }}>
                          <input
                            type="checkbox"
                            checked={tem}
                            onChange={() => togglePermissao(acao.key, perfil)}
                            style={{ width:16, height:16, accentColor:'#f97316', cursor:'pointer' }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color:'#3a3a3a', fontSize:11, marginTop:18 }}>
            SA = Super Admin · {PERFIS_PERMISSAO.map(p => `${PERFIS_LABEL[p]?.split(' ')[0]} = ${p}`).join(' · ')}
          </p>
        </div>
      )}
    </div>
  )
}