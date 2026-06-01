import emailjs from '@emailjs/browser'

const SERVICE_ID  = 'service_m8qpurh'
const TEMPLATE_ID = 'template_i30t3qu'
const PUBLIC_KEY  = 'l3V6kGCFtUEsTNGsP'

export const generateAndSendMagicLink = async (email, role) => {
  const token = crypto.randomUUID()

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token + 'heliobenin_2026')
  )
  const hashedToken = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))

  sessionStorage.setItem('helio_magic', JSON.stringify({
    hash: hashedToken,
    email,
    role,
    expires: Date.now() + 10 * 60 * 1000,
  }))

  const link = `${window.location.origin}/auth?token=${token}&role=${role}`

  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { email, passcode: link },
    PUBLIC_KEY
  )
}

export const verifyMagicLink = async (token, role) => {
  const stored = sessionStorage.getItem('helio_magic')
  if (!stored) return { success: false, message: 'Lien expiré' }

  const { hash, email, role: storedRole, expires } = JSON.parse(stored)

  if (Date.now() > expires) {
    sessionStorage.removeItem('helio_magic')
    return { success: false, message: 'Lien expiré' }
  }

  if (storedRole !== role) return { success: false, message: 'Lien invalide' }

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token + 'heliobenin_2026')
  )
  const hashedToken = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))

  if (hashedToken !== hash) return { success: false, message: 'Lien invalide' }

  sessionStorage.removeItem('helio_magic')
  return { success: true, email, role }
}
