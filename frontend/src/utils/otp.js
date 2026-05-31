export const generateAndStoreOtp = async (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString()

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(code + 'heliobenin_2026')
  )
  const hashedCode = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))

  sessionStorage.setItem('helio_otp', JSON.stringify({
    hash:    hashedCode,
    expires: Date.now() + 10 * 60 * 1000,
    email,
  }))

  return code
}

export const verifyOtp = async (saisi) => {
  const stored = sessionStorage.getItem('helio_otp')
  if (!stored) return { success: false, message: 'Code expiré' }

  const { hash, expires } = JSON.parse(stored)

  if (Date.now() > expires) {
    sessionStorage.removeItem('helio_otp')
    return { success: false, message: 'Code expiré' }
  }

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(saisi + 'heliobenin_2026')
  )
  const hashedSaisi = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))

  if (hashedSaisi !== hash) {
    return { success: false, message: 'Code incorrect' }
  }

  sessionStorage.removeItem('helio_otp')
  return { success: true }
}
