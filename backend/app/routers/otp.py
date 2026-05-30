import random
import string
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
import httpx
from app.config import settings

router = APIRouter(prefix="/api/otp", tags=["otp"])

otp_store: dict = {}


class OtpEnvoyerRequest(BaseModel):
    email: str
    whatsapp: Optional[str] = None


class OtpVerifierRequest(BaseModel):
    email: str
    code: str


@router.post("/envoyer")
def envoyer_otp(req: OtpEnvoyerRequest):
    code = ''.join(random.choices(string.digits, k=6))
    expires_at = datetime.now() + timedelta(minutes=10)

    otp_store[req.email] = {
        "code": code,
        "expires_at": expires_at,
        "whatsapp": req.whatsapp,
    }

    # Email via Resend
    if settings.RESEND_API_KEY:
        try:
            import resend
            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": "HélioBénin <noreply@heliobenin.com>",
                "to": req.email,
                "subject": "Votre code de connexion HélioBénin",
                "html": (
                    f"<div style='font-family:sans-serif;max-width:480px'>"
                    f"<h2 style='color:#F59E0B'>HélioBénin</h2>"
                    f"<p>Votre code de connexion :</p>"
                    f"<h1 style='letter-spacing:0.2em;color:#1E293B'>{code}</h1>"
                    f"<p style='color:#64748B'>Valable 10 minutes. Ne le partagez pas.</p>"
                    f"</div>"
                ),
            })
        except Exception as e:
            print(f"[Resend] Erreur envoi email: {e}")

    # WhatsApp via CallMeBot
    if req.whatsapp and settings.CALLMEBOT_APIKEY:
        try:
            phone = req.whatsapp.replace(' ', '')
            url = (
                f"https://api.callmebot.com/whatsapp.php"
                f"?phone={phone}"
                f"&text=HélioBénin+code:+{code}"
                f"&apikey={settings.CALLMEBOT_APIKEY}"
            )
            httpx.get(url, timeout=10)
        except Exception as e:
            print(f"[CallMeBot] Erreur envoi WhatsApp: {e}")

    return {"success": True}


@router.post("/verifier")
def verifier_otp(req: OtpVerifierRequest):
    entry = otp_store.get(req.email)
    if not entry:
        return {"success": False, "message": "Code incorrect ou expiré"}

    if datetime.now() > entry["expires_at"]:
        otp_store.pop(req.email, None)
        return {"success": False, "message": "Code incorrect ou expiré"}

    if entry["code"] != req.code:
        return {"success": False, "message": "Code incorrect ou expiré"}

    otp_store.pop(req.email, None)
    return {"success": True, "message": "Code valide"}
