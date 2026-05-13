from .loader import load_all_equipements

SECTIONS_DC  = [2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95]
SECTIONS_AC  = [2.5, 4, 6, 10, 16]
CALIBRES_DC  = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 630]
CALIBRES_AC  = [10, 16, 20, 25, 32, 40, 63, 80, 100]
FUSIBLES_NH  = [
    {"calibre_max": 100,  "type": "NH000", "porte_fusible": "Porte-fusible NH000"},
    {"calibre_max": 160,  "type": "NH00",  "porte_fusible": "Porte-fusible NH00"},
    {"calibre_max": 250,  "type": "NH1",   "porte_fusible": "Porte-fusible NH1"},
    {"calibre_max": 400,  "type": "NH2",   "porte_fusible": "Porte-fusible NH2"},
    {"calibre_max": 630,  "type": "NH3",   "porte_fusible": "Porte-fusible NH3"},
]

_cache = None

def get_equipements() -> dict:
    global _cache
    if _cache is None:
        _cache = load_all_equipements()
    return _cache
