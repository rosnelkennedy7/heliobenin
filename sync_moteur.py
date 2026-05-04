#!/usr/bin/env python3
"""
HélioBénin — Script de synchronisation du moteur
Usage : python sync_moteur.py
À exécuter après chaque modification de backend/app/moteur/
"""

import shutil
import os
from datetime import datetime

SOURCE = os.path.join('backend', 'app', 'moteur')
DEST   = os.path.join('api', 'moteur')

def sync():
    if not os.path.exists(SOURCE):
        print(f"Erreur : Source introuvable : {SOURCE}")
        return

    shutil.copytree(SOURCE, DEST, dirs_exist_ok=True)

    fichiers = os.listdir(DEST)
    print(f"Moteur synchronise — {datetime.now().strftime('%H:%M:%S')}")
    print(f"   Source : {SOURCE}")
    print(f"   Dest   : {DEST}")
    print(f"   Fichiers : {', '.join(fichiers)}")

if __name__ == "__main__":
    sync()
