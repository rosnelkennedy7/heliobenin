import { getUserTechnicien } from '../utils/storage'
import styles from './Avatar.module.css'

export default function AvatarTech() {
  const _u   = getUserTechnicien()
  const user = _u.email ? _u : { prenom: 'Tech', nom: 'Nicien', role: 'technicien' }

  const nomInitial = (user.nom?.[0] || 'U').toUpperCase()
  const fullName   = [user.prenom, user.nom].filter(Boolean).join(' ')

  return (
    <div className={styles.wrap}>
      <div className={styles.avatarBtn} style={{ cursor: 'default', pointerEvents: 'none' }}>
        <div className={styles.circle}>{nomInitial}</div>
        <span className={styles.fullName}>{fullName}</span>
      </div>
    </div>
  )
}
