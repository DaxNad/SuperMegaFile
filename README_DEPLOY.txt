# SuperMegaFile — AutoSync Package (GitHub + Vercel)

Contenuto:
- /piano_produzione_pwa_v2  → WebApp PWA (Ricerca + Flussi + Imballi + Team), offline
- /data                      → Copia dei CSV principali
- /api/webhook.js            → Endpoint per aggiornare i file nel repo via GitHub API (HMAC SHA256)
- vercel.json                → Config Vercel (API + rewrite alla PWA)
- package.json               → Metadati progetto
- .env.example               → Variabili ambiente richieste

Deploy rapido:
1) Carica su GitHub (repo: DaxNad/SuperMegaFile)
2) Importa in Vercel e imposta env vars:
   - WEBHOOK_SECRET
   - GITHUB_TOKEN (permesso contents:write)
   - REPO_OWNER=DaxNad
   - REPO_NAME=SuperMegaFile
   - REPO_BRANCH=main
3) Deploy.

Uso /api/webhook (POST):
Header: x-webhook-signature = "sha256=" + HMAC_SHA256(WEBHOOK_SECRET, rawBody)
Body JSON:
{
  "message": "Update from MegaFile",
  "files": [
    {"path":"data/codici_seed.csv","content":"<testo CSV>"},
    {"path":"data/flussi.csv","content":"<testo CSV>"}
  ]
}
