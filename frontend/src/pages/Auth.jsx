import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyMagicLink } from '../utils/magicLink'
import { supabase } from '../utils/supabaseClient'
import { saveUserTechnicien, saveUserParticulier, getTechnicien } from '../utils/storage'

export default function Auth() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()

  useEffect(() => {
    const redirectTech = async (profile) => {
      const { data: abo } = await supabase
        .from('abonnements').select('type, date_fin, statut')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()

      const qcmValide = profile.qcm_valide || getTechnicien().qcm_valide || false
      if (!qcmValide) { navigate('/qcm-tech'); return }

      if (abo) {
        if (abo.type === 'unique') { navigate('/paiement-tech'); return }
        if (abo.type === 'mensuel' || abo.type === 'annuel') {
          if (new Date(abo.date_fin) > new Date()) { navigate('/dashboard-tech'); return }
          navigate('/paiement-tech'); return
        }
      }
      navigate('/paiement-tech')
    }

    const verify = async () => {
      const token = params.get('token')
      const role  = params.get('role')

      if (!token || !role) { navigate('/'); return }

      const result = await verifyMagicLink(token, role)

      if (!result.success) {
        navigate(`/${role === 'technicien' ? 'login-tech' : 'login'}?error=lien_expire`)
        return
      }

      localStorage.setItem('heliobenin_role', role)

      // Mode local sans Supabase : résoudre depuis localStorage uniquement
      if (!supabase) {
        const pendingRaw = localStorage.getItem('helio_pending_reg')
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw)
          if (pending.email === result.email && pending.role === role) {
            localStorage.removeItem('helio_pending_reg')
            if (role === 'technicien') {
              saveUserTechnicien({ ...pending, role: 'technicien' })
              navigate('/qcm-tech')
            } else {
              saveUserParticulier({ ...pending, role: 'particulier' })
              navigate('/paiement')
            }
            return
          }
        }
        const storedKey = role === 'technicien' ? 'helio_user_technicien' : 'helio_user_particulier'
        const localUser = JSON.parse(localStorage.getItem(storedKey) || 'null')
        if (localUser?.email === result.email) {
          if (role === 'technicien') {
            const qcmValide = localUser.qcm_valide || getTechnicien().qcm_valide || false
            navigate(qcmValide ? '/paiement-tech' : '/qcm-tech')
          } else {
            navigate('/paiement')
          }
          return
        }
        navigate(`/${role === 'technicien' ? 'login-tech' : 'login'}`)
        return
      }

      // Chercher profil existant
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('email', result.email).maybeSingle()

      // Inscription : profil pas encore créé → lire données en attente
      if (!profile) {
        const pendingRaw = localStorage.getItem('helio_pending_reg')
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw)
          if (pending.email === result.email && pending.role === role) {
            try {
              const { data: newProfile } = await supabase
                .from('profiles').insert([pending]).select().single()
              localStorage.removeItem('helio_pending_reg')
              if (role === 'technicien') {
                if (newProfile) saveUserTechnicien({ ...newProfile, role: 'technicien' })
                navigate('/qcm-tech')
              } else {
                if (newProfile) saveUserParticulier({ ...newProfile, role: 'particulier' })
                navigate('/paiement')
              }
              return
            } catch (e) {
              console.error('[Auth] insert profile:', e)
            }
          }
        }
        navigate(`/${role === 'technicien' ? 'login-tech' : 'login'}`)
        return
      }

      // Login : profil existant
      if (role === 'technicien') {
        saveUserTechnicien({ ...profile, role: 'technicien' })
        await redirectTech(profile)
      } else {
        saveUserParticulier({ ...profile, role: 'particulier' })
        navigate('/paiement')
      }
    }
    verify()
  }, []) // eslint-disable-line

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '2rem' }}>☀️</div>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)' }}>Vérification en cours…</p>
    </div>
  )
}
