from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from moteur.moteur_technicien import (
    calculer_etape1,
    calculer_etape2,
    calculer_etape3
)

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

@app.post("/api/calcul/etape1")
def calcul_etape1(params: ParamsEtape1):
    params_dict = params.dict()
    params_dict["appareils"] = [
        a.dict() for a in params.appareils
    ]
    return calculer_etape1(params_dict)

@app.post("/api/calcul/etape2")
def calcul_etape2(data: dict):
    return calculer_etape2(
        data["etape1"],
        data["params"],
        data["equipements"]
    )

@app.post("/api/calcul/etape3")
def calcul_etape3(data: dict):
    return calculer_etape3(
        data["etape1"],
        data["etape2"],
        data["params"],
        data["equipements"]
    )
