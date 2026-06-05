import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyMagicLink } from '../utils/magicLink'
import { supabase } from '../utils/supabaseClient'
import { saveUserTechnicien, saveUserParticulier } from '../utils/storage'

export default function Auth() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()

  useEffect(() => {
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

        const { data: abo } = await supabase
          .from('abonnements').select('type, date_fin')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle()

        if (!profile.qcm_valide)            { navigate('/qcm-tech');      return }
        if (!abo || abo.type === 'unique')   { navigate('/paiement-tech'); return }
        if (new Date(abo.date_fin) > new Date()) { navigate('/dashboard-tech'); return }
        navigate('/paiement-tech')

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
