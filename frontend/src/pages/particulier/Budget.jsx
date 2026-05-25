import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Avatar from '../../components/Avatar'
import vitreImg from '../../assets/images/vitre.png'
import { getParticulier, saveParticulier } from '../../utils/storage'

function fmtBudget(raw) {
  const digits = (raw || '').toString().replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const fmt = n => Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export default function Budget() {
  const navigate   = useNavigate()
  const data       = getParticulier()
  const manque     = data.manque     || 0
  const cout       = data.cout_estime || 0
  const initBudget = data.budget     || 500000

  const [budgetDisplay, setBudgetDisplay] = useState(fmtBudget(initBudget.toString()))

  const budgetNum = parseInt(budgetDisplay.replace(/\s/g, ''), 10) || 0
  const budgetOk  = budgetNum >= 500000

  const handleContinuer = () => {
    if (!budgetOk) return
    saveParticulier({ budget: budgetNum, resultats: null })
    navigate('/resultats')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundImage: `url(${vitreImg})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 0, pointerEvents: 'none' }} />

      <Navbar avatar={<Avatar />} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>
            Modifier votre budget
          </h2>

          {/* Message manque */}
          {manque > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 14px', fontSize: '0.88rem', lineHeight: 1.5 }}>
              <span style={{ color: '#FCA5A5' }}>Il vous manque </span>
              <strong style={{ color: '#EF4444' }}>{fmt(manque)} FCFA</strong>
              <span style={{ color: '#FCA5A5' }}> pour cette installation.</span>
              <br />
              <span style={{ color: '#FCA5A5' }}>Budget minimum suggéré : </span>
              <strong style={{ color: '#EF4444' }}>{fmt(cout)} FCFA</strong>
            </div>
          )}

          {/* Input budget */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Nouveau budget
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.07)',
              border: `1.5px solid ${budgetDisplay && !budgetOk ? '#EF4444' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 9, padding: '0 0.9rem',
            }}>
              <input
                type="text"
                inputMode="numeric"
                value={budgetDisplay}
                onChange={e => setBudgetDisplay(fmtBudget(e.target.value))}
                placeholder="500 000"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '1rem', padding: '0.72rem 0', fontFamily: 'inherit' }}
              />
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', fontWeight: 600 }}>FCFA</span>
            </div>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: budgetDisplay && !budgetOk ? '#EF4444' : 'rgba(255,255,255,0.4)' }}>
              Budget minimum : 500 000 FCFA
            </p>
          </div>

          {/* Bouton principal */}
          <button
            onClick={handleContinuer}
            disabled={!budgetOk}
            style={{
              padding: '0.75rem',
              background: budgetOk ? '#F59E0B' : 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: 9,
              color: budgetOk ? '#000' : 'rgba(255,255,255,0.28)',
              fontSize: '1rem', fontWeight: 700,
              cursor: budgetOk ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              transition: 'background 0.2s',
            }}
          >
            Recalculer avec ce budget →
          </button>

          {/* Retour appareils */}
          <button
            onClick={() => navigate('/appareils')}
            style={{
              padding: '0.6rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 9,
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.9rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.2s',
            }}
          >
            ‹ Retour aux appareils
          </button>
        </div>
      </div>
    </div>
  )
}
