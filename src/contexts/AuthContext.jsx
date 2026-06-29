import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc,
  collection, query, where, getDocs,
  serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../firebase/config.js'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [perfil, setPerfil]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [erro, setErro]           = useState('')
  // 'loading' | 'unauthenticated' | 'unauthorized' | 'authenticated'
  const [authStatus, setAuthStatus] = useState('loading')

  // Verifica se há convite pendente para o email e cria o usuário automaticamente
  async function processarConvite(firebaseUser) {
    try {
      const q = query(
        collection(db, 'convites'),
        where('email', '==', firebaseUser.email.toLowerCase()),
        where('usado', '==', false)
      )
      const snap = await getDocs(q)
      if (snap.empty) return null

      const conviteDoc = snap.docs[0]
      const convite = conviteDoc.data()

      const novoUsuario = {
        nome:         convite.nome || firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email:        firebaseUser.email.toLowerCase(),
        perfil:       convite.perfil,
        ativo:        true,
        criadoEm:     serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        conviteId:    conviteDoc.id,
      }

      await setDoc(doc(db, 'usuarios', firebaseUser.uid), novoUsuario)
      await updateDoc(doc(db, 'convites', conviteDoc.id), {
        usado:    true,
        usadoPor: firebaseUser.uid,
        usadoEm:  serverTimestamp(),
      })

      return novoUsuario
    } catch (e) {
      console.error('Erro ao processar convite:', e)
      return null
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setPerfil(null)
        setErro('')
        setAuthStatus('unauthenticated')
        setLoading(false)
        return
      }

      try {
        // 1. Tenta carregar documento do usuário (até 3x, pois pode estar sendo criado)
        let snap = null
        for (let i = 0; i < 3; i++) {
          snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
          if (snap.exists()) break
          await new Promise(r => setTimeout(r, 800))
        }

        if (snap && snap.exists()) {
          const data = snap.data()
          if (!data.ativo) {
            setErro('Usuário desativado. Contate o administrador.')
            await signOut(auth)
            setUser(null)
            setPerfil(null)
            setAuthStatus('unauthorized')
          } else {
            setErro('')
            setUser(firebaseUser)
            setPerfil(data)
            setAuthStatus('authenticated')
            // Atualiza último acesso sem bloquear
            updateDoc(doc(db, 'usuarios', firebaseUser.uid), {
              ultimoAcesso: serverTimestamp()
            }).catch(() => {})
          }
        } else {
          // 2. Sem documento — verifica convite
          const novoUsuario = await processarConvite(firebaseUser)

          if (novoUsuario) {
            setErro('')
            setUser(firebaseUser)
            setPerfil(novoUsuario)
            setAuthStatus('authenticated')
          } else {
            // Sem convite — acesso negado (não faz logout, apenas bloqueia)
            setErro('Acesso não autorizado. Contate o administrador.')
            setUser(firebaseUser)   // mantém user para exibir email na tela de bloqueio
            setPerfil(null)
            setAuthStatus('unauthorized')
          }
        }
      } catch (e) {
        setErro('Erro ao carregar perfil: ' + e.message)
        setAuthStatus('unauthorized')
      }

      setLoading(false)
    })
    return unsub
  }, [])

  async function loginGoogle() {
    setErro('')
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setErro('Erro ao fazer login: ' + e.message)
      }
    }
  }

  async function logout() {
    await signOut(auth)
    setUser(null)
    setPerfil(null)
    setErro('')
    setAuthStatus('unauthenticated')
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, loginGoogle, logout, erro, authStatus }}>
      {children}
    </AuthContext.Provider>
  )
}