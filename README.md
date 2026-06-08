# 🛒 KEPOS (Sistem Point of Sale / POS)

KEPOS adalah platform Point of Sale (Kasir) modern berkinerja tinggi yang dirancang dengan arsitektur monorepo terpisah. Sistem ini membagi fungsionalitas menjadi **Next.js (Frontend SPA)** yang berjalan di browser client dan **Laravel (Backend API)** sebagai gateway logika bisnis & database.

---

## 🏗️ Arsitektur Sistem

Sistem ini dirancang untuk kemudahan instalasi lokal dan performa yang tangguh di lingkungan gerai/toko:
- **Client Side (Frontend)**: Next.js (React) + TailwindCSS + Lucide Icons + Zustand (State Management).
- **Server Side (Backend)**: Laravel 11 API Gateway + SQLite Database + Laravel Sanctum (SPA Authentication).
- **Komunikasi**: REST API via HTTPS dengan format data JSON.

---

## ✨ Fitur Utama

### 🔐 1. Keamanan & Multi-Role (RBAC)
- Autentikasi aman berbasis cookie SPA menggunakan Laravel Sanctum.
- Pembagian peran terperinci: `super_admin`, `manager`, `supervisor`, `kasir`, `pramuniaga`, `stocker`.
- Proteksi halaman rute (Route Guards) di tingkat frontend dan middleware otorisasi di tingkat backend.

### 📦 2. Manajemen Inventori & Master Data
- CRUD Produk dan Kategori dengan barcode/SKU unik.
- Notifikasi status stok kritis (*low stock alert*) secara real-time berdasarkan batas minimal (*threshold*) yang ditentukan.

### ⚖️ 3. Penyesuaian Stok (Stock Adjustment) & Log Mutasi
- Form pencatatan opname selisih stok (surplus/defisit) dan restock barang masuk.
- **Logika Batas Persetujuan Finansial**:
  - Penyesuaian dengan nilai finansial **&le; Rp 100.000** disetujui otomatis (`approved`), stok terpotong seketika, dan mencatat mutasi log.
  - Penyesuaian dengan nilai finansial **> Rp 100.000** masuk ke status `pending_approval` dan memerlukan verifikasi manual oleh Manager sebelum stok disesuaikan.
- Log mutasi stok bersifat permanen (*immutable*) untuk mencegah manipulasi data inventori.

---

## 🛠️ Panduan Instalasi & Menjalankan Proyek

Sistem ini didukung penuh oleh containerisasi menggunakan **Podman/Docker** untuk kemudahan development lokal tanpa memerlukan instalasi database/dependency manual pada sistem operasi host.

### 1. Menjalankan Backend (Laravel API)
Pindah ke direktori backend, salin file konfigurasi lingkungan, instal dependensi, lalu jalankan server:

```bash
cd backend
cp .env.example .env

# Jalankan container backend server
podman run -d --name pos-backend-server -p 8000:8000 -v $(pwd):/app:Z pos-php-dev php artisan serve --host=0.0.0.0 --port=8000

# Jalankan migrasi database & seed data awal
podman run --rm -it -v $(pwd):/app:Z pos-php-dev php artisan migrate:fresh --seed
```

### 2. Menjalankan Frontend (Next.js)
Pindah ke direktori frontend, instal paket npm, dan jalankan server pengembangan:

```bash
cd ../frontend
npm install
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

---

## 👥 Pengguna Default Pengujian (Seeder)
Gunakan akun default berikut setelah melakukan fresh migration:
- **Manager**: `manager@toko.com` (password: `password123` | PIN: `654321`)
- **Stocker**: `stocker@toko.com` (password: `password123` | PIN: `112233`)
- **Supervisor**: `supervisor@toko.com` (password: `password123` | PIN: `123456`)
- **Kasir**: `kasir@toko.com` (password: `password123` | PIN: `000000`)
# SISTEM-POINT-OF-SALE-KEPOS-
