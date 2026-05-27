from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..moteur.moteur_technicien import (
    calculer_etape1,
    calculer_etape2,
    calculer_etape3,
)

router = APIRouter(prefix="/api/calcul/technicien", tags=["calcul-technicien"])


def normaliser_panneau(p: dict) -> dict:
    return {
        "puissance":       p.get("puissance")       or p.get("Puissance (Wc)")        or 0,
        "voc":             p.get("voc")             or p.get("Voc (V)")               or 0,
        "vmp":             p.get("vmp")             or p.get("Vmp (V)")               or 0,
        "isc":             p.get("isc")             or p.get("Isc (A)")               or 0,
        "tension_nominale": p.get("tension_nominale") or p.get("Tension nominale (V)") or 24,
    }


def normaliser_onduleur(o: dict) -> dict:
    return {
        "puissance":  o.get("puissance")  or o.get("Puissance (W)")       or 0,
        "usys":       o.get("usys")       or o.get("Tension système (V)") or 48,
        "mppt_min":   o.get("mppt_min")   or o.get("MPPT min (V)")        or 60,
        "mppt_max":   o.get("mppt_max")   or o.get("MPPT max (V)")        or 500,
        "pv_max":     o.get("pv_max")     or o.get("PV max (W)")          or 9999,
        "rendement":  o.get("rendement")  or o.get("Rendement (%)")       or 97,
    }


def normaliser_batterie(b: dict) -> dict:
    return {
        "capacite":    b.get("capacite")    or b.get("Capacité (Ah)") or 200,
        "tension":     b.get("tension")     or b.get("Tension (V)")   or 48,
        "dod":         b.get("dod")         or b.get("DoD (%)")       or 80,
        "rendement":   b.get("rendement")   or b.get("Rendement (%)") or 95,
        "technologie": b.get("technologie") or b.get("Technologie")   or "",
    }


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
    tension_nominale: float = 24.0


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


@router.post("/etape1")
def calcul_etape1(params: ParamsEtape1):
    appareils_dict = [a.model_dump() for a in params.appareils]
    params_dict = params.model_dump()
    params_dict["appareils"] = appareils_dict
    return calculer_etape1(params_dict)


@router.post("/etape2")
def calcul_etape2(params: ParamsEtape2):
    equipements = {
        "panneau": normaliser_panneau(params.panneau.model_dump()),
        "type_regulateur": params.type_regulateur,
    }
    if params.onduleur:
        equipements["onduleur"] = normaliser_onduleur(params.onduleur.model_dump())
    if params.batterie:
        equipements["batterie"] = normaliser_batterie(params.batterie.model_dump())
    if params.usys:
        equipements["usys"] = params.usys
    if params.vmax_mppt:
        equipements["vmax_mppt"] = params.vmax_mppt

    try:
        return calculer_etape2(
            params.etape1,
            params.params.model_dump(),
            equipements,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/etape3")
def calcul_etape3(params: ParamsEtape3):
    equipements = {
        "panneau": normaliser_panneau(params.panneau.model_dump()),
        "type_regulateur": params.type_regulateur,
    }
    try:
        return calculer_etape3(
            params.etape1,
            params.etape2,
            params.params.model_dump(),
            equipements,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
