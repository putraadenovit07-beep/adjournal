# AdJournal — Paid Traffic & Adsense Tracker

**Demo:** https://putraadenovit07-beep.github.io/adjournal/

App pelacak kampanye iklan berbayar & Adsense untuk blogger Indonesia.
Dibangun dengan React + Vite, semua data disimpan di `localStorage` (tanpa backend/database).

## Fitur
- **Dashboard** — Stat cards (Total Spend, Penghasilan, Profit, ROI) + Progress Milestone
- **Campaign** — Buat & kelola kampanye iklan per platform
- **Catat Harian** — Input data ADS + Adsense dengan:
  - 🔄 **Auto-konversi USD → IDR** menggunakan kurs live otomatis (open.er-api.com, cache 1 jam)
- **Jurnal** — Riwayat entri per kampanye (edit/hapus)
- **Goals** — Milestone klik harian + tracking progress real-time
- **Analitik** — Top ROI, Top Revenue, progress balik modal

## Tech Stack
- React 18 + TypeScript + Vite
- Custom CSS (dark theme, tanpa Tailwind)
- Semua data di `localStorage`

## Cara Pakai Lokal
```bash
npm install
npm run build:pages   # build untuk GitHub Pages
```

## Catatan
- Kurs USD→IDR diambil otomatis dari [open.er-api.com](https://open.er-api.com) (bukan Google Finance, tapi update setiap jam)
- Data tersimpan di browser, tidak ada server/cloud
