import flaagImg from '../assets/images/flaag.jpg'
import styles from './Navbar.module.css'

export default function Navbar({ stepper, avatar }) {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navLeft}>
        <img src={flaagImg} alt="Bénin" className={styles.flag} />
        <div className={styles.logo}>
          <span className={styles.logoText}>
            <span className={styles.logoHelio}>Hélio</span>
            <span className={styles.logoBenin}>Bénin</span>
          </span>
        </div>
      </div>

      <div className={styles.navStepper}>
        {stepper}
      </div>

      <div className={styles.navAvatar}>
        {avatar}
      </div>
    </nav>
  )
}
