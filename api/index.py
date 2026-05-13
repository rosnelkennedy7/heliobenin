import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from moteur.moteur_technicien import (
    calculer_etape1 as tech_etape1,
    calculer_etape2 as tech_etape2,
    calculer_etape3 as tech_etape3,
)
from moteur.moteur_particulier import (
    calculer_etape1 as part_etape1,
    calculer_etape2 as part_etape2,
    calculer_etape3 as part_etape3,
)
from moteur.loader import load_all_equipements

app = FastAPI(title="HélioBénin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "HélioBénin API opérationnelle"}


@app.get("/health")
def health():
    return {"status": "ok"}


class Appareil(BaseModel):
    nom: str
    puissance: float
    quantite: int
    h_jour: float
    h_nuit: float
    facteur_pointe: float = 1.0


class Panneau(BaseModel):
    puissance: float
    voc: float
    vmp: float
    isc: float


class Onduleur(BaseModel):
    puissance: int
    usys: int
    mppt_min: float
    mppt_max: float
    pv_max: float


class Batterie(BaseModel):
    capacite: float
    tension: int
    dod: float = 90.0
    rendement: float = 95.0
    technologie: str = ""


class ParamsEtape1(BaseModel):
    appareils: List[Appareil]
    cs: float
    k: float
    eta: float = 0.80
    n_jours: float = 2.0
    dod: float = 0.90
    eta_bat: float = 0.95
    irradiation: float
    latitude: float
    pr: Optional[float] = None
    longueur_panneau_ond: float = 10.0
    longueur_reg_bat: float = 2.0
    longueur_bat_ond: float = 2.0
    longueur_ond_tableau: float = 10.0
    type_regulateur: str = "AIO"


class ParamsEtape2(BaseModel):
    etape1: dict
    params: ParamsEtape1
    panneau: Panneau
    onduleur: Optional[Onduleur] = None
    batterie: Optional[Batterie] = None
    type_regulateur: str = "AIO"
    usys: Optional[int] = None
    vmax_mppt: Optional[float] = None


class ParamsEtape3(BaseModel):
    etape1: dict
    etape2: dict
    params: ParamsEtape1
    panneau: Panneau
    type_regulateur: str = "AIO"


# ── Technicien ──────────────────────────────────────────────

@app.post("/api/calcul/technicien/etape1")
def calcul_tech_etape1(params: ParamsEtape1):
    params_dict = params.model_dump()
    params_dict["appareils"] = [a.model_dump() for a in params.appareils]
    return tech_etape1(params_dict)


@app.post("/api/calcul/technicien/etape2")
def calcul_tech_etape2(params: ParamsEtape2):
    equipements = {
        "panneau": params.panneau.model_dump(),
        "type_regulateur": params.type_regulateur,
    }
    if params.onduleur:
        equipements["onduleur"] = params.onduleur.model_dump()
    if params.batterie:
        equipements["batterie"] = params.batterie.model_dump()
    if params.usys:
        equipements["usys"] = params.usys
    if params.vmax_mppt:
        equipements["vmax_mppt"] = params.vmax_mppt
    return tech_etape2(params.etape1, params.params.model_dump(), equipements)


@app.post("/api/calcul/technicien/etape3")
def calcul_tech_etape3(params: ParamsEtape3):
    equipements = {
        "panneau": params.panneau.model_dump(),
        "type_regulateur": params.type_regulateur,
    }
    return tech_etape3(params.etape1, params.etape2, params.params.model_dump(), equipements)


# ── Particulier ─────────────────────────────────────────────

@app.post("/api/calcul/particulier/etape1")
def calcul_part_etape1(params: ParamsEtape1):
    params_dict = params.model_dump()
    params_dict["appareils"] = [a.model_dump() for a in params.appareils]
    return part_etape1(params_dict)


@app.post("/api/calcul/particulier/etape2")
def calcul_part_etape2(params: ParamsEtape2):
    equipements = {
        "panneau": params.panneau.model_dump(),
        "type_regulateur": params.type_regulateur,
    }
    if params.onduleur:
        equipements["onduleur"] = params.onduleur.model_dump()
    if params.batterie:
        equipements["batterie"] = params.batterie.model_dump()
    if params.usys:
        equipements["usys"] = params.usys
    if params.vmax_mppt:
        equipements["vmax_mppt"] = params.vmax_mppt
    return part_etape2(params.etape1, params.params.model_dump(), equipements)


@app.get("/api/equipements")
def get_equipements():
    return load_all_equipements()


@app.post("/api/calcul/particulier/etape3")
def calcul_part_etape3(params: ParamsEtape3):
    equipements = {
        "panneau": params.panneau.model_dump(),
        "type_regulateur": params.type_regulateur,
    }
    return part_etape3(params.etape1, params.etape2, params.params.model_dump(), equipements)
