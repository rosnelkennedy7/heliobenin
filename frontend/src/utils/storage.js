function getUserId(role) {
  const key = role === 'technicien' ? 'helio_user_technicien' : 'helio_user_particulier'
  const user = JSON.parse(localStorage.getItem(key) || '{}')
  if (!user.email) return 'guest'
  let hash = 0
  for (let i = 0; i < user.email.length; i++) {
    hash = ((hash << 5) - hash) + user.email.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

/* ── Particulier ── */
export const getCurrentModeParticulier = () =>
  localStorage.getItem('heliobenin_mode_particulier') || 'solaire_sans_budget'

export const setCurrentModeParticulier = (mode) =>
  localStorage.setItem('heliobenin_mode_particulier', mode)

export const saveParticulier = (data, mode = null) => {
  const m = mode || getCurrentModeParticulier()
  const uid = getUserId('particulier')
  const key = `heliobenin_part_${uid}_${m}`
  const existing = JSON.parse(localStorage.getItem(key) || '{}')
  localStorage.setItem(key, JSON.stringify({ ...existing, ...data }))
}

export const getParticulier = (mode = null) => {
  const m = mode || getCurrentModeParticulier()
  const uid = getUserId('particulier')
  const key = `heliobenin_part_${uid}_${m}`
  return JSON.parse(localStorage.getItem(key) || '{}')
}

export const clearParticulier = () => {
  const uid = getUserId('particulier')
  const modes = ['solaire_sans_budget', 'solaire_avec_budget', 'sbee_sans_budget', 'sbee_avec_budget']
  modes.forEach(m => localStorage.removeItem(`heliobenin_part_${uid}_${m}`))
  localStorage.removeItem('heliobenin_mode_particulier')
  localStorage.removeItem('heliobenin_particulier')
}

/* ── Technicien ── */
export const saveTechnicien = (data) => {
  const uid = getUserId('technicien')
  const key = `heliobenin_tech_${uid}`
  const existing = JSON.parse(localStorage.getItem(key) || '{}')
  localStorage.setItem(key, JSON.stringify({ ...existing, ...data }))
}

export const getTechnicien = () => {
  const uid = getUserId('technicien')
  return JSON.parse(localStorage.getItem(`heliobenin_tech_${uid}`) || '{}')
}

export const clearTechnicien = () => {
  const uid = getUserId('technicien')
  localStorage.removeItem(`heliobenin_tech_${uid}`)
  localStorage.removeItem('heliobenin_technicien')
}

/* ── Profils utilisateurs ── */
export const saveUserParticulier = (user) =>
  localStorage.setItem('helio_user_particulier', JSON.stringify(user))

export const getUserParticulier = () =>
  JSON.parse(localStorage.getItem('helio_user_particulier') || '{}')

export const saveUserTechnicien = (user) =>
  localStorage.setItem('helio_user_technicien', JSON.stringify(user))

export const getUserTechnicien = () =>
  JSON.parse(localStorage.getItem('helio_user_technicien') || '{}')
