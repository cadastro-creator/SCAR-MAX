import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

export function getConfigPadrao() {
  return {
    notificacoes: {
      inApp: {
        ativo: true,
        eventos: {
          solicitacaoAprovada: true,
          solicitacaoDevolvida: true,
          solicitacaoReprovada: true,
          novoCadastroFiscal: true,
          novoCadastroGerencia: true,
          lembreteVPE: true,
        },
      },
      email: {
        ativo: false,
        appsScriptUrl: '',
        eventos: {
          solicitacaoAprovada: { comprador: true, fiscal: false, gerenteComercial: false },
          solicitacaoDevolvida: { comprador: true },
          solicitacaoReprovada: { comprador: true },
          lembreteVPE: { gestorCadastro: false, gerenteComercial: false },
        },
      },
      chat: {
        ativo: false,
        // Cada espaço: { id, nome, webhook, eventos: string[] }
        // 'eventos' usa as mesmas chaves de tipo: 'APROVACAO' | 'DEVOLUCAO' | etc.
        espacos: [],
      },
      obrigatoriedades: {
        exigirVerificacaoFiscal: false,
        exigirVerificacaoGerencia: false,
      },
    },
    permissoes: {
      criarSolicitacao: ['COMPRADOR', 'GESTOR_CADASTRO', 'SUPER_ADMIN'],
      aprovar:          ['GESTOR_CADASTRO', 'SUPER_ADMIN'],
      devolver:         ['GESTOR_CADASTRO', 'SUPER_ADMIN'],
      reprovar:         ['GESTOR_CADASTRO', 'SUPER_ADMIN'],
      editarProduto:    ['GESTOR_CADASTRO', 'SUPER_ADMIN'],
      verRelatorios:    ['GESTOR_CADASTRO', 'SUPER_ADMIN', 'GERENTE_COMERCIAL'],
      gerenciarUsuarios:     ['SUPER_ADMIN'],
      acessarConfiguracoes:  ['SUPER_ADMIN', 'GESTOR_CADASTRO'],
    },
    lembreteVPE: {
      ativo: true,
      intervaloDias: 7,
      perfisAlerta: ['GESTOR_CADASTRO', 'GERENTE_COMERCIAL'],
    },
  }
}

// Faz merge profundo para garantir que campos novos do padrão
// apareçam mesmo em configs antigas já salvas no Firestore
function mergeDeep(base, override) {
  const result = { ...base }
  for (const key of Object.keys(override || {})) {
    if (
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      override[key] !== null
    ) {
      result[key] = mergeDeep(base[key] || {}, override[key])
    } else {
      result[key] = override[key]
    }
  }
  return result
}

export async function getConfigSistema() {
  try {
    const snap = await getDoc(doc(db, 'configuracoes', 'sistema'))
    return snap.exists() ? mergeDeep(getConfigPadrao(), snap.data()) : getConfigPadrao()
  } catch {
    return getConfigPadrao()
  }
}

// Cria notificação in-app no Firestore
export async function criarNotificacao({
  tipo, titulo, mensagem, perfis,
  solicitacaoId = null, produtoId = null, codigoCitel = null,
}) {
  return addDoc(collection(db, 'notificacoes'), {
    tipo,
    titulo,
    mensagem,
    perfis: perfis || [],
    leitores: {}, // { [uid]: timestamp } — populado ao marcar como lida
    solicitacaoId,
    produtoId,
    codigoCitel,
    criadoEm: serverTimestamp(),
  })
}

// Envia request ao Apps Script.
// Usa mode: 'no-cors' + Content-Type: text/plain para evitar preflight
// CORS. A resposta é opaca (não legível), mas o request é enviado.
// Chat também passa por aqui — Apps Script usa UrlFetchApp para chamar
// o webhook do Google Chat sem problemas de CORS server-side.
export async function enviarAppsScript(url, payload) {
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.error('[NEXUS] Apps Script error:', e)
  }
}

async function dispararChat(n, texto, tipoEvento) {
  if (!n.chat?.ativo || !n.email?.appsScriptUrl) return
  for (const espaco of n.chat.espacos || []) {
    if (espaco.webhook && (espaco.eventos || []).includes(tipoEvento)) {
      await enviarAppsScript(n.email.appsScriptUrl, {
        acao: 'chat',
        webhook: espaco.webhook,
        mensagem: texto,
      })
    }
  }
}

// ─── Disparos por evento ────────────────────────────────────────────────────

export async function notificarAprovacao({ solicitacao, codigoCitel }) {
  const cfg = await getConfigSistema()
  const n = cfg.notificacoes
  const desc = solicitacao.descricao || 'produto'
  const ev = n.inApp?.eventos || {}

  if (n.inApp?.ativo) {
    if (ev.solicitacaoAprovada) {
      await criarNotificacao({
        tipo: 'APROVACAO',
        titulo: 'Solicitação aprovada',
        mensagem: `"${desc}" aprovada. Código CITEL: ${codigoCitel}`,
        perfis: ['COMPRADOR'],
        solicitacaoId: solicitacao.id,
        codigoCitel,
      })
    }
    if (ev.novoCadastroFiscal) {
      await criarNotificacao({
        tipo: 'NOVO_CADASTRO_FISCAL',
        titulo: 'Novo produto — conferir tributação',
        mensagem: `"${desc}" (${codigoCitel}): verifique CEST, NCM e dados fiscais.`,
        perfis: ['FISCAL'],
        solicitacaoId: solicitacao.id,
        codigoCitel,
      })
    }
    if (ev.novoCadastroGerencia) {
      await criarNotificacao({
        tipo: 'NOVO_CADASTRO_GERENCIA',
        titulo: 'Novo produto — conferir precificação',
        mensagem: `"${desc}" (${codigoCitel}): verifique precificação e margem.`,
        perfis: ['GERENTE_COMERCIAL'],
        solicitacaoId: solicitacao.id,
        codigoCitel,
      })
    }
  }

  if (n.email?.ativo && n.email.appsScriptUrl) {
    const evEmail = n.email.eventos?.solicitacaoAprovada || {}
    if (evEmail.comprador && solicitacao.emailSolicitante) {
      await enviarAppsScript(n.email.appsScriptUrl, {
        acao: 'email',
        para: solicitacao.emailSolicitante,
        assunto: `[NEXUS] Solicitação aprovada — ${codigoCitel}`,
        corpo: `Olá ${solicitacao.solicitante || ''},\n\nSua solicitação "${desc}" foi aprovada.\nCódigo CITEL: ${codigoCitel}\n\nNEXUS MAX — Contattos`,
      })
    }
  }

  await dispararChat(
    n,
    `✅ *Cadastro aprovado*\n*Produto:* ${desc}\n*Cód. CITEL:* \`${codigoCitel}\`\n*Solicitante:* ${solicitacao.solicitante || '—'}`,
    'APROVACAO'
  )
}

export async function notificarDevolucao({ solicitacao, motivo }) {
  const cfg = await getConfigSistema()
  const n = cfg.notificacoes
  const desc = solicitacao.descricao || 'produto'

  if (n.inApp?.ativo && n.inApp.eventos?.solicitacaoDevolvida) {
    await criarNotificacao({
      tipo: 'DEVOLUCAO',
      titulo: 'Solicitação devolvida',
      mensagem: `"${desc}" devolvida para correção. Motivo: ${motivo || 'não informado'}`,
      perfis: ['COMPRADOR'],
      solicitacaoId: solicitacao.id,
    })
  }

  if (n.email?.ativo && n.email.appsScriptUrl && n.email.eventos?.solicitacaoDevolvida?.comprador) {
    if (solicitacao.emailSolicitante) {
      await enviarAppsScript(n.email.appsScriptUrl, {
        acao: 'email',
        para: solicitacao.emailSolicitante,
        assunto: `[NEXUS] Solicitação devolvida — ${desc}`,
        corpo: `Olá ${solicitacao.solicitante || ''},\n\nSua solicitação "${desc}" foi devolvida para correção.\nMotivo: ${motivo || 'não informado'}\n\nNEXUS MAX — Contattos`,
      })
    }
  }

  await dispararChat(n, `🔄 *Solicitação devolvida*\n*Produto:* ${desc}\n*Motivo:* ${motivo || '—'}`, 'DEVOLUCAO')
}

export async function notificarReprovacao({ solicitacao, motivo }) {
  const cfg = await getConfigSistema()
  const n = cfg.notificacoes
  const desc = solicitacao.descricao || 'produto'

  if (n.inApp?.ativo && n.inApp.eventos?.solicitacaoReprovada) {
    await criarNotificacao({
      tipo: 'REPROVACAO',
      titulo: 'Solicitação reprovada',
      mensagem: `"${desc}" foi reprovada. Motivo: ${motivo || 'não informado'}`,
      perfis: ['COMPRADOR'],
      solicitacaoId: solicitacao.id,
    })
  }

  if (n.email?.ativo && n.email.appsScriptUrl && n.email.eventos?.solicitacaoReprovada?.comprador) {
    if (solicitacao.emailSolicitante) {
      await enviarAppsScript(n.email.appsScriptUrl, {
        acao: 'email',
        para: solicitacao.emailSolicitante,
        assunto: `[NEXUS] Solicitação reprovada — ${desc}`,
        corpo: `Olá ${solicitacao.solicitante || ''},\n\nSua solicitação "${desc}" foi reprovada.\nMotivo: ${motivo || 'não informado'}\n\nNEXUS MAX — Contattos`,
      })
    }
  }

  await dispararChat(n, `❌ *Solicitação reprovada*\n*Produto:* ${desc}\n*Motivo:* ${motivo || '—'}`, 'REPROVACAO')
}

export async function criarLembreteVPE({ produto, config: cfgExterno }) {
  const cfg = cfgExterno || await getConfigSistema()
  if (!cfg.lembreteVPE?.ativo) return

  await criarNotificacao({
    tipo: 'LEMBRETE_VPE',
    titulo: 'Lembrete VPE',
    mensagem: `"${produto.descricao || produto.codigoCitel}" em VPE ativo — verifique se ainda está em estoque.`,
    perfis: cfg.lembreteVPE.perfisAlerta || ['GESTOR_CADASTRO', 'GERENTE_COMERCIAL'],
    produtoId: produto.codigoCitel,
    codigoCitel: produto.codigoCitel,
  })

  const n = cfg.notificacoes
  if (n) {
    await dispararChat(
      n,
      `🟠 *Lembrete VPE*\n*Produto:* ${produto.descricao || produto.codigoCitel} (\`${produto.codigoCitel}\`)\nVerifique se ainda consta em estoque.`,
      'LEMBRETE_VPE'
    )
  }
}