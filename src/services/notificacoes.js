import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config.js'

// ─── CONFIG DO SISTEMA ────────────────────────────────────────────────────────
export async function getConfigSistema() {
  try {
    const snap = await getDoc(doc(db, 'config', 'sistema'))
    return snap.exists() ? snap.data() : {}
  } catch {
    return {}
  }
}

// ─── HELPERS INTERNOS ─────────────────────────────────────────────────────────
async function criarNotificacao({ titulo, mensagem, perfis, codigoCitel = null }) {
  await addDoc(collection(db, 'notificacoes'), {
    titulo,
    mensagem,
    perfis,       // array de strings — quem recebe (array-contains query)
    codigoCitel,
    leitores: {},  // { [uid]: Date }
    criadoEm: serverTimestamp(),
  })
}

// ─── APROVAÇÃO ────────────────────────────────────────────────────────────────
export async function notificarAprovacao({ solicitacao, codigoCitel }) {
  await criarNotificacao({
    titulo: 'Solicitação aprovada',
    mensagem: `"${solicitacao.descricao || solicitacao.id}" foi aprovada e cadastrada no CITEL.`,
    perfis: ['SUPER_ADMIN', 'GESTOR_CADASTRO', 'COMPRADOR', 'ALMOXARIFADO', 'RECEBIMENTO'],
    codigoCitel,
  })
}

// ─── DEVOLUÇÃO ────────────────────────────────────────────────────────────────
export async function notificarDevolucao({ solicitacao, motivo }) {
  await criarNotificacao({
    titulo: 'Solicitação devolvida',
    mensagem: `"${solicitacao.descricao || solicitacao.id}" foi devolvida${motivo ? `: ${motivo}` : '.'}`,
    perfis: ['SUPER_ADMIN', 'GESTOR_CADASTRO'],
    codigoCitel: solicitacao.codigoCitel || null,
  })
}

// ─── REPROVAÇÃO ───────────────────────────────────────────────────────────────
export async function notificarReprovacao({ solicitacao, motivo }) {
  await criarNotificacao({
    titulo: 'Solicitação reprovada',
    mensagem: `"${solicitacao.descricao || solicitacao.id}" foi reprovada${motivo ? `: ${motivo}` : '.'}`,
    perfis: ['SUPER_ADMIN', 'GESTOR_CADASTRO'],
    codigoCitel: solicitacao.codigoCitel || null,
  })
}

// ─── LEMBRETE VPE ─────────────────────────────────────────────────────────────
export async function criarLembreteVPE({ produto, config }) {
  const dias = config.lembreteVPE?.intervaloDias || 7
  await criarNotificacao({
    titulo: 'Lembrete VPE',
    mensagem: `O produto "${produto.descricao || produto.codigoCitel}" está em VPE há mais de ${dias} dias. Verifique a situação.`,
    perfis: ['SUPER_ADMIN', 'GESTOR_CADASTRO'],
    codigoCitel: produto.codigoCitel,
  })
}
