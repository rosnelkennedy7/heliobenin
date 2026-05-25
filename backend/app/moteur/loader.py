import openpyxl
import os
import glob


def find_excel_equipements() -> str:
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    patterns = [
        os.path.join(data_dir, '*.xlsx'),
        os.path.join(data_dir, '**/*.xlsx'),
    ]
    for pattern in patterns:
        for f in glob.glob(pattern):
            name = os.path.basename(f).lower()
            if 'equipement' in name or 'equipment' in name:
                print(f"Excel trouvé : {repr(f)}")
                return f
    raise FileNotFoundError("Fichier HélioBénin Equipement.xlsx introuvable dans data/")


EXCEL_PATH = find_excel_equipements()


def _parse_plage(s):
    try:
        clean = str(s).replace('V', '').strip()
        parts = clean.split('-')
        return float(parts[0]), float(parts[-1])
    except Exception:
        return 0.0, 500.0


def load_sheet(sheet_name: str) -> list:
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return []
    headers = [str(h).strip() for h in rows[0]]
    result = []
    for row in rows[1:]:
        if any(v is not None for v in row):
            result.append(dict(zip(headers, row)))
    return result


def _normalize_panneaux(rows):
    result = []
    for r in rows:
        try:
            result.append({
                'marque': r.get('Marque'),
                'modele': r.get('Modèle'),
                'type': r.get('Type'),
                'puissance': float(r.get('P (Wc)') or 0),
                'tension_nominale': int(r.get('Tension nominale (V)') or 0),
                'voc': float(r.get('Voc (V)') or 0),
                'isc': float(r.get('Isc (A)') or 0),
                'vmp': float(r.get('Vmp (V)') or 0),
                'imp': float(r.get('Imp (A)') or 0),
                'rendement': float(r.get('Rendement (%)') or 0),
            })
        except Exception:
            continue
    return result


def _normalize_onduleurs_aio(rows):
    result = []
    for r in rows:
        try:
            mppt_min, mppt_max = _parse_plage(r.get('Plage MPPT (V)', '0-500'))
            result.append({
                'marque': r.get('Marque'),
                'modele': r.get('Modèle'),
                'puissance': int(r.get('Puissance (W)') or 0),
                'tension_sortie': int(r.get('Tension sortie AC (V)') or 230),
                'usys': int(r.get('Tension système (V)') or 48),
                'courant_charge_bat': float(r.get('Courant charge bat. (A)') or 0),
                'mppt_min': mppt_min,
                'mppt_max': mppt_max,
                'courant_mppt_max': float(r.get('Courant MPPT max (A)') or 999),
                'pv_max': float(r.get('Puissance PV max (W)') or 0),
                'nb_mppt': int(r.get('Nb MPPT') or 1),
                'rendement': float(r.get('Rendement (%)') or 97),
            })
        except Exception:
            continue
    return result


def _normalize_batteries(rows):
    result = []
    for r in rows:
        try:
            result.append({
                'marque': r.get('Marque'),
                'modele': r.get('Modèle'),
                'technologie': r.get('Technologie'),
                'tension': int(r.get('Tension (V)') or 0),
                'capacite': float(r.get('Capacité (Ah)') or 0),
                'energie': float(r.get('Énergie (kWh)') or 0),
                'dod': float(r.get('DoD (%)') or 90),
                'rendement': float(r.get('Rendement (%)') or 95),
                'courant_decharge_max': float(r.get('Courant décharge max (A)') or 0),
            })
        except Exception:
            continue
    return result


def _normalize_regulateurs(rows):
    result = []
    for r in rows:
        try:
            result.append({
                'marque': r.get('Marque'),
                'modele': r.get('Modèle'),
                'type': r.get('Type'),
                'courant_max': float(r.get('Courant max (A)') or 0),
                'tension_systeme': str(r.get('Tension système (V)') or ''),
                'plage_pv': str(r.get('Plage tension PV (V)') or ''),
            })
        except Exception:
            continue
    return result


def load_all_equipements() -> dict:
    return {
        'panneaux':             _normalize_panneaux(load_sheet('Panneaux Solaires')),
        'batteries':            _normalize_batteries(load_sheet('Batteries')),
        'onduleurs_aio':        _normalize_onduleurs_aio(load_sheet('Onduleurs All-in-One')),
        'onduleurs_hybrides':   load_sheet('Onduleurs Hybrides'),
        'onduleurs_classiques': load_sheet('Onduleurs Classiques'),
        'regulateurs':          _normalize_regulateurs(load_sheet('Régulateurs')),
        'disjoncteurs':         load_sheet('Disjoncteurs'),
        'differentiels':        load_sheet('Différentiels AC'),
        'fusibles':             load_sheet('Fusibles DC'),
        'porte_fusibles':       load_sheet('Porte-fusibles'),
        'parafoudres':          load_sheet('Parafoudres'),
    }
