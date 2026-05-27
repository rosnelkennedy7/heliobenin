from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.calcul import router as calcul_router
from app.routers.calcul_particulier import router as calcul_particulier_router
from app.routers.equipements import router as equipements_router
from app.routers.admin.auth import router as admin_auth_router
from app.routers.admin.dashboard import router as admin_dashboard_router

app = FastAPI(
    title="HélioBénin API",
    description="API de dimensionnement et devis solaires pour le Bénin",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.ALLOWED_ORIGINS) + [
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calcul_router)
app.include_router(calcul_particulier_router)
app.include_router(equipements_router)
app.include_router(admin_auth_router)
app.include_router(admin_dashboard_router)


@app.get("/")
def root():
    return {"message": "HélioBénin API v1.0", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}
