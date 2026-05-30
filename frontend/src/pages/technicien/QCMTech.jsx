import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import vitreImg from '../../assets/images/vitre.webp'
import AvatarTech from '../../components/AvatarTech'
import { saveTechnicien, getUserTechnicien } from '../../utils/storage'
import { supabase } from '../../utils/supabaseClient'
import styles from './QCMTech.module.css'

const questions = [
  {
    id: 1,
    question: "Un panneau solaire produit quel type de courant ?",
    options: [
      "Courant alternatif (AC)",
      "Courant continu (DC)",
      "Les deux à la fois",
      "Ça dépend de l'ensoleillement",
    ],
    correct: 1,
  },
  {
    id: 2,
    question: "Quelle est la différence entre un onduleur et un régulateur de charge ?",
    options: [
      "C'est le même équipement",
      "L'onduleur convertit DC en AC, le régulateur protège les batteries contre la surcharge",
      "Le régulateur convertit DC en AC, l'onduleur stocke l'énergie",
      "L'onduleur mesure l'irradiation, le régulateur stabilise la tension",
    ],
    correct: 1,
  },
  {
    id: 3,
    question: "Quelle est la première règle de sécurité avant toute intervention sur une installation électrique solaire ?",
    options: [
      "Porter des équipements de protection et couper toutes les sources d'énergie",
      "Vérifier que le client est absent",
      "Couper uniquement le disjoncteur principal AC",
      "Tester les appareils un par un sous tension",
    ],
    correct: 0,
  },
  {
    id: 4,
    question: "Quelle mauvaise pratique réduit le plus rapidement la durée de vie d'une batterie solaire ?",
    options: [
      "La charger complètement chaque jour",
      "La décharger régulièrement en dessous de sa limite recommandée",
      "La stocker dans un endroit frais",
      "L'utiliser avec un régulateur MPPT",
    ],
    correct: 1,
  },
  {
    id: 5,
    question: "Dans une installation solaire, quelle couleur de câble utilise-t-on pour le positif DC ?",
    options: [
      "Noir",
      "Bleu",
      "Rouge",
      "Vert/jaune",
    ],
    correct: 2,
  },
  {
    id: 6,
    question: "Un client consomme 2 000 Wh par jour. Combien de panneaux de 400 Wc faut-il si l'irradiation moyenne est de 4h/j ?",
    options: [
      "1 panneau",
      "2 panneaux",
      "4 panneaux",
      "5 panneaux",
    ],
    correct: 1,
  },
]

export default function QCMTech() {
  const navigate = useNavigate()
  const [reponses,  setReponses]  = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score,     setScore]     = useState(0)

  const toutesRepondues = Object.keys(reponses).length === questions.length

  const handleSelect = (qId, optIdx) => {
    if (submitted) return
    setReponses(prev => ({ ...prev, [qId]: optIdx }))
  }

  const handleValider = async () => {
    if (!toutesRepondues) return
    let s = 0
    questions.forEach(q => {
      if (reponses[q.id] === q.correct) s++
    })
    setScore(s)
    setSubmitted(true)
    if (s >= 4) {
      saveTechnicien({ qcm_valide: true })
      try {
        const email = getUserTechnicien().email
        if (email && supabase) {
          await supabase.from('profiles').update({ qcm_valide: true }).eq('email', email)
        }
      } catch (e) { console.error('[QCM] Supabase update:', e) }
      setTimeout(() => navigate('/paiement-tech'), 2000)
    }
  }

  const handleRetry = () => {
    setReponses({})
    setSubmitted(false)
    setScore(0)
  }

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />
      <AvatarTech />
      <div className={styles.content}>

        {/* Conteneur unique centré */}
        <div style={{
          width: '100%',
          maxWidth: 600,
          margin: '0 auto',
          padding: '0 1rem 2rem',
        }}>

          {/* Logo + titre */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingTop: '1rem' }}>
            <div className={styles.cardLogo}>
              <span className={styles.logoText}>
                <span className={styles.logoHelio}>Hélio</span>
                <span className={styles.logoBenin}>Bénin</span>
              </span>
            </div>
            <p className={styles.cardSlogan}>
              Test de qualification : répondez aux 6 questions
            </p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Score minimum requis : 4/6
            </p>
          </div>

          {/* Bandeau résultat */}
          {submitted && (
            <div style={{
              background: score >= 4 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: score >= 4 ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(239,68,68,0.4)',
              borderRadius: 10,
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              color: score >= 4 ? '#22C55E' : '#EF4444',
              fontWeight: 600,
            }}>
              {score >= 4
                ? `✅ Félicitations ! ${score}/6 — Redirection en cours…`
                : `❌ Score insuffisant : ${score}/6 (minimum 4/6 requis)`}
              {score < 4 && (
                <>
                  <br />
                  <button
                    onClick={handleRetry}
                    style={{
                      marginTop: '0.8rem',
                      padding: '0.5rem 1.5rem',
                      background: '#EF4444',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                    }}
                  >
                    Recommencer
                  </button>
                </>
              )}
            </div>
          )}

          {/* Questions — dans un seul bloc */}
          <div style={{
            background: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: '1rem',
          }}>
            {questions.map((q, qi) => (
              <div
                key={q.id}
                style={{
                  padding: '1.2rem 1.5rem',
                  borderBottom: qi < questions.length - 1
                    ? '1px solid rgba(255,255,255,0.06)'
                    : 'none',
                  background: submitted
                    ? reponses[q.id] === q.correct
                      ? 'rgba(34,197,94,0.05)'
                      : 'rgba(239,68,68,0.05)'
                    : 'transparent',
                }}
              >
                <p style={{
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  marginBottom: '0.8rem',
                  lineHeight: 1.5,
                }}>
                  {qi + 1}. {q.question}
                </p>

                <div className={styles.options}>
                  {q.options.map((opt, oi) => {
                    const isSelected = reponses[q.id] === oi
                    const isCorrect  = submitted && oi === q.correct
                    const isWrong    = submitted && isSelected && oi !== q.correct

                    return (
                      <button
                        key={oi}
                        className={[
                          styles.option,
                          isSelected && !submitted ? styles.optionSelected : '',
                          isCorrect               ? styles.optionCorrect  : '',
                          isWrong                 ? styles.optionWrong    : '',
                        ].join(' ')}
                        onClick={() => handleSelect(q.id, oi)}
                      >
                        <span className={`${styles.optionCircle} ${isSelected ? styles.optionCircleSelected : ''}`} />
                        <span className={styles.optionText}>{opt}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bouton Valider */}
          {!submitted && (
            <button
              className={styles.btnNext}
              onClick={handleValider}
              disabled={!toutesRepondues}
              style={{
                opacity: toutesRepondues ? 1 : 0.4,
                cursor: toutesRepondues ? 'pointer' : 'not-allowed',
              }}
            >
              {toutesRepondues
                ? 'Valider mes réponses ✓'
                : `Répondez à toutes les questions (${Object.keys(reponses).length}/6)`}
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
