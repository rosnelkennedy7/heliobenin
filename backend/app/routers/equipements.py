from fastapi import APIRouter
from ..moteur.loader import load_all_equipements

router = APIRouter(prefix="/api/equipements", tags=["equipements"])


@router.get("/")
def get_equipements():
    return load_all_equipements()
