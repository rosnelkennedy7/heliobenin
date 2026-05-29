import { Routes, Route } from 'react-router-dom'
import DevTools from './components/DevTools'
import Accueil from './pages/Accueil'
import LoginParticulier from './pages/particulier/Login'
import InscriptionParticulier from './pages/particulier/Inscription'
import PaiementParticulier from './pages/particulier/Paiement'
import Profil from './pages/particulier/Profil'
import ChoixMode from './pages/particulier/ChoixMode'
import QCM from './pages/particulier/QCM'
import Localisation from './pages/particulier/Localisation'
import Appareils from './pages/particulier/Appareils'
import Resultats from './pages/particulier/Resultats'
import Budget from './pages/particulier/Budget'
import LoginTech from './pages/technicien/Login'
import InscriptionTech from './pages/technicien/Inscription'
import PaiementTech from './pages/technicien/Paiement'
import LocalisationTech from './pages/technicien/Localisation'
import QCMTech from './pages/technicien/QCMTech'
import AppareilsTech from './pages/technicien/AppareilsTech'
import Etude from './pages/technicien/Etude'
import DevisTech from './pages/technicien/Devis'
import RapportTech from './pages/technicien/Rapport'
import DashboardTech from './pages/technicien/Dashboard'
import MesProjets from './pages/technicien/MesProjets'

export default function App() {
  return (
    <>
    <Routes>
      {/* Accueil */}
      <Route path="/" element={<Accueil />} />

      {/* Particulier */}
      <Route path="/login"        element={<LoginParticulier />} />
      <Route path="/inscription"  element={<InscriptionParticulier />} />
      <Route path="/paiement"     element={<PaiementParticulier />} />
      <Route path="/profil"       element={<Profil />} />
      <Route path="/choix-mode"   element={<ChoixMode />} />
      <Route path="/qcm"          element={<QCM />} />
      <Route path="/localisation" element={<Localisation />} />
      <Route path="/appareils"    element={<Appareils />} />
      <Route path="/resultats"    element={<Resultats />} />
      <Route path="/budget"       element={<Budget />} />

      {/* Technicien */}
      <Route path="/login-tech"        element={<LoginTech />} />
      <Route path="/inscription-tech"  element={<InscriptionTech />} />
      <Route path="/paiement-tech"     element={<PaiementTech />} />
      <Route path="/localisation-tech" element={<LocalisationTech />} />
      <Route path="/qcm-tech"          element={<QCMTech />} />
      <Route path="/appareils-tech"    element={<AppareilsTech />} />
      <Route path="/etude-tech"        element={<Etude />} />
      <Route path="/devis-tech"        element={<DevisTech />} />
      <Route path="/rapport-tech"      element={<RapportTech />} />
      <Route path="/dashboard-tech"    element={<DashboardTech />} />
      <Route path="/mes-projets-tech"  element={<MesProjets />} />
    </Routes>
    <DevTools />
    </>
  )
}
