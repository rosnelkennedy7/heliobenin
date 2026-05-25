from .loader import load_all_equipements

# ── Sections câbles H1Z2Z2K (PV DC)
SECTIONS_H1Z2Z2K = [
    2.5, 4, 6, 10, 16, 25, 35
]

# ── Sections câbles souple DC
# (batterie/onduleur) min 10mm²
SECTIONS_SOUPLE_DC = [
    10, 16, 25, 35, 50, 70, 95
]

# ── Sections câbles AC monophasé
# H07RN-F 3×
SECTIONS_AC_MONO = [2.5, 4, 6, 10, 16]

# ── Sections câbles AC triphasé
# H07RN-F 5×
SECTIONS_AC_TRI = [2.5, 4, 6, 10, 16]

# ── Calibres disjoncteurs DC 2P
CALIBRES_DC = [10, 16, 20, 25, 32, 63, 80]

# ── Calibres fusibles gPV
CALIBRES_GPV = [
    4, 6, 10, 15, 20, 25, 32, 40, 50
]

# ── Calibres différentiels 2P 30mA
CALIBRES_DIFF_2P = [16, 25, 40, 63, 80, 100]

# ── Calibres différentiels 4P 30mA
CALIBRES_DIFF_4P = [25, 40, 63, 80, 100]

# ── Fusibles NH (normes IEC)
FUSIBLES_NH = [
    {
        "calibre": 100,
        "type": "NH000",
        "porte_fusible": "Porte-fusible NH000"
    },
    {
        "calibre": 125,
        "type": "NH00",
        "porte_fusible": "Porte-fusible NH00"
    },
    {
        "calibre": 160,
        "type": "NH00",
        "porte_fusible": "Porte-fusible NH00"
    },
    {
        "calibre": 200,
        "type": "NH1",
        "porte_fusible": "Porte-fusible NH1"
    },
    {
        "calibre": 250,
        "type": "NH1",
        "porte_fusible": "Porte-fusible NH1"
    },
    {
        "calibre": 315,
        "type": "NH2",
        "porte_fusible": "Porte-fusible NH2"
    },
    {
        "calibre": 400,
        "type": "NH2",
        "porte_fusible": "Porte-fusible NH2"
    },
    {
        "calibre": 630,
        "type": "NH3",
        "porte_fusible": "Porte-fusible NH3"
    },
]

_cache = None

def get_equipements() -> dict:
    global _cache
    if _cache is None:
        _cache = load_all_equipements()
    return _cache
