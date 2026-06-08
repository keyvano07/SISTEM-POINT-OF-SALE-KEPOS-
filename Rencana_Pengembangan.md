# 📋 Rencana Pengembangan & Trello Backlog Checklist — Sistem POS

Dokumen ini disusun untuk memudahkan Anda memindahkan rencana kerja pengembangan (Next.js & Laravel) ke dalam **Trello**. Anda cukup menyalin judul kolom (**Trello Lists**) dan detail kartu (**Trello Cards**) beserta daftar tugas di dalamnya (**Card Checklist**).

---

## 📅 Urutan Prioritas Pengembangan (Roadmap)

Untuk meminimalkan blocker, pengembangan dilakukan secara **incremental (bertahap)** dengan urutan berikut:
1. **Fase 1 (Pondasi & Auth):** Menyiapkan kerangka kerja Next.js + Laravel, Database, dan sistem Login.
2. **Fase 2 (Master Data & Inventori):** CRUD Produk dan Kategori sebagai dasar transaksi.
3. **Fase 3 (Order Draft - Pramuniaga):** Alur awal pembuatan pesanan oleh Pramuniaga di tablet.
4. **Fase 4 (Shift & Kas Laci):** Validasi prasyarat transaksi Kasir (Buka Shift).
5. **Fase 5 (Transaksi & Kasir):** Alur checkout utama kasir (tarik draft, hitung kembalian, bayar).
6. **Fase 6 (Otorisasi, Void & Audit):** PIN Bypass supervisor, pembatalan transaksi, dan log audit immutable.
7. **Fase 7 (Diskon & Member):** Tambahan loyalty member, sistem promo, dan cetak struk.
8. **Fase 8 (Integrasi, QA & Deployment):** End-to-end testing, security hardening, dan persiapan deployment.

---

## 📌 Trello Board Setup (Lists, Cards & Checklists)

### 📋 LIST 1: FASE 1 - PONDASI & AUTHENTICATION
---
#### Card 1: Setup Backend & Database SQLite
*   **Description:** Menyiapkan boilerplate Laravel 11, konfigurasi database, dan otentikasi Sanctum.
*   **Checklist:**
    *   [x] Membuat Struktur folder monorepo untuk Laravel dan Next.js
    *   [x] Inisialisasi proyek Laravel 11.
    *   [x] Konfigurasi database SQLite di file `.env`.
    *   [x] Install package Laravel Sanctum untuk SPA Auth.
    *   [x] Buat migration awal: `stores`, `users` (tabel master).
    *   [x] Buat database seeder untuk Roles default (`super_admin`, `manager`, `supervisor`, `kasir`, `pramuniaga`, `stocker`) dan 1 Akun Super Admin default.
    *   [x] Jalankan migrasi dan seeder `php artisan migrate:fresh --seed`.
    *   [x] Test login user via Postman (dapatkan token bearer).

#### Card 2: Setup Frontend Next.js & Client API
*   **Description:** Membuat kerangka Next.js 14 App Router, setup Axios client, dan routing dasar.
*   **Checklist:**
    *   [x] Inisialisasi proyek Next.js 14 dengan TypeScript dan Tailwind CSS v4.
    *   [x] Buat struktur folder proyek: `components/`, `hooks/`, `store/`, `services/`.
    *   [x] Setup Axios/Fetch base client (`services/api.ts`) dengan interceptor untuk handle `Authorization Bearer Token` dan redirect error `401`.
    *   [x] Install Zustand untuk state management global.
    *   [x] Buat `useAuthStore` di Zustand untuk menyimpan user data & JWT token.

#### Card 3: Integrasi Login & Middleware Auth
*   **Description:** Menghubungkan form login di Next.js dengan API Laravel Auth, serta proteksi route.
*   **Checklist:**
    *   [x] Buat halaman Login (`src/app/(auth)/login/page.tsx`) di Next.js.
    *   [x] Hubungkan form login dengan endpoint API `POST /api/v1/auth/login`.
    *   [x] Simpan token di Cookie/LocalStorage dan set ke Zustand state.
    *   [x] Buat Route Guard (Next.js Middleware) untuk mengalihkan user non-login ke halaman `/login`.
    *   [x] Buat Middleware Role di Laravel API untuk membatasi endpoint berdasarkan hak akses user.
    *   [x] Buat endpoint `POST /api/v1/auth/logout` di Laravel dan hapus session token di Next.js saat dipanggil.

---

### 📋 LIST 2: FASE 2 - INVENTORY & MASTER DATA
---
#### Card 1: CRUD Kategori & Produk (Backend)
*   **Description:** Membuat endpoint API untuk mengelola kategori produk dan detail produk.
*   **Checklist:**
    *   [x] Buat migration: `categories` dan `products`.
    *   [x] Buat model Laravel `Category` dan `Product` beserta relasinya.
    *   [x] Buat Controller `ProductController` dengan endpoint API:
        *   `GET /api/v1/products` (List & Search Barcode/SKU)
        *   `POST /api/v1/products` (Create - Manager Only)
        *   `PUT /api/v1/products/{id}` (Update & ubah harga - Manager Only)
    *   [x] Tambahkan request validation rules untuk SKU & Barcode unik.

#### Card 2: Management Produk (Frontend)
*   **Description:** Membuat tampilan Dashboard Management Inventori untuk manajer toko.
*   **Checklist:**
    *   [x] Buat halaman dashboard inventori (`src/app/dashboard/manager/products/page.tsx`).
    *   [x] Buat table list produk dengan fitur pencarian dan pagination.
    *   [x] Buat modal form Tambah Produk Baru.
    *   [x] Buat modal form Edit Produk & Update Harga Jual.
    *   [x] Hubungkan semua form dengan API backend Laravel.

#### Card 3: Stock Adjustment & Log Pergerakan (Stocker)
*   **Description:** Logika pengajuan adjustment stok barang oleh Stocker dan log pergerakan stok immutable.
*   **Checklist:**
    *   [x] Buat migration: `stock_adjustments` dan `stock_movements`.
    *   [x] Buat model `StockAdjustment` dan `StockMovement`.
    *   [x] Implementasikan Logic di `StockService` Laravel:
        *   Jika nilai finansial adjustment <= 100k: otomatis set status `approved`, potong/tambah `products.stock_quantity`, tulis log ke `stock_movements`.
        *   Jika nilai finansial > 100k: set status `pending_approval`.
    *   [x] Buat endpoint API:
        *   `POST /api/v1/stock-adjustments` (Stocker submit)
        *   `GET /api/v1/stock-adjustments` (List adjustment)
    *   [x] Buat dashboard stocker di Next.js untuk melihat riwayat opname dan input barang masuk.

---

### 📋 LIST 3: FASE 3 - ORDER DRAFT (MODUL PRAMUNIAGA)
---
#### Card 1: API Order Draft & Auto Expiry (Backend)
*   **Description:** Endpoint penampung antrean draf pesanan dari pramuniaga dengan masa kedaluwarsa 2 jam.
*   **Checklist:**
    *   [x] Buat migration: `order_drafts` dan `order_draft_items`.
    *   [x] Buat endpoint `POST /api/v1/order-drafts` (Pramuniaga membuat draft).
    *   [x] Implementasikan generator unik `queue_id` otomatis (contoh: `Q-070626-0001`).
    *   [x] Set kolom `expires_at = created_at + 2 jam`.
    *   [x] Buat Laravel Console Command & Scheduler untuk otomatis meng-expire draf yang melewati batas waktu (`status = expired`).
    *   [x] Buat endpoint `GET /api/v1/order-drafts/{id}` untuk detail isi draft (mendukung lookup by ID numerik maupun Queue ID string).
    *   [x] Buat endpoint `POST /api/v1/order-drafts/{id}/lock` (Kasir mengunci draft saat checkout).
    *   [x] Buat endpoint `POST /api/v1/order-drafts/{id}/unlock` (Membuka kunci draft dengan PIN Supervisor).
    *   [x] Buat endpoint `PUT /api/v1/order-drafts/{id}` (Edit item keranjang setelah draft di-unlock).

#### Card 2: Tablet Pramuniaga UI (Frontend)
*   **Description:** Tampilan aplikasi pramuniaga untuk input menu/produk dan generate nomor antrean (Queue ID).
*   **Checklist:**
    *   [x] Buat folder route khusus tablet pramuniaga (`src/app/pramuniaga/page.tsx`).
    *   [x] Buat grid pencarian produk cepat berbasis kategori.
    *   [x] Buat keranjang draf lokal (Zustand store `useCartStore` di tablet).
    *   [x] Buat halaman input nomor meja (jika *dine-in*) / tipe order (*take-away*).
    *   [x] Tombol submit order draft ke API backend.
    *   [x] Tampilkan modal nomor antrean (Queue ID) berukuran besar setelah sukses disubmit agar bisa difoto/dicatat.

---

### 📋 LIST 4: FASE 4 - CASHIER SHIFT & LACI KAS
---
#### Card 1: Buka & Tutup Shift (Backend)
*   **Description:** Rekonsiliasi keuangan kasir menggunakan metode Blind Cash Drop.
*   **Checklist:**
    *   [x] Buat migration: `shifts`.
    *   [x] Implementasikan generator unik `shift_code` (format: `SHIFT-YYYYMMDD-XXXX`, auto-reset harian).
    *   [x] Buat endpoint `POST /api/v1/shifts/open` (Kasir input `opening_cash` / modal awal).
    *   [x] Buat endpoint `POST /api/v1/shifts/close` (Kasir input `physical_cash_input` saat pulang kerja).
    *   [x] Tulis logic di backend: hitung selisih (`discrepancy = physical_cash - expected_cash`) saat shift diclose, namun sembunyikan hasilnya dari respons user kasir (Blind Drop).
    *   [x] Revoke token Sanctum kasir secara otomatis saat API `POST /shifts/close` dipanggil (auto-logout server-side).
    *   [x] Buat endpoint `GET /api/v1/shifts/active` untuk memeriksa apakah kasir memiliki shift aktif.

#### Card 2: Alur Shift Kasir (Frontend)
*   **Description:** Interface pembatas kasir wajib mengisi kas laci sebelum melayani pelanggan.
*   **Checklist:**
    *   [x] Buat Zustand store `useShiftStore` untuk tracking shift status kasir.
    *   [x] Buat Modal/Halaman Buka Shift (input modal awal, misal Rp 100.000).
    *   [x] Proteksi halaman POS Next.js: Jika status `GET /api/v1/shifts/active` adalah null, alihkan kasir ke halaman Buka Shift.
    *   [x] Buat halaman Tutup Shift (input nominal laci kasir manual). Setelah disubmit, panggil API logout dan bersihkan local storage kasir.

---

### 📋 LIST 5: FASE 5 - TRANSAKSI & CHECKOUT KASIR
---
#### Card 1: Tarik Draft & Keranjang Kasir (Frontend)
*   **Description:** Kasir menarik antrean draf pesanan dari pramuniaga dan mengunci data draf.
*   **Checklist:**
    *   [x] Buat halaman POS utama kasir (`src/app/pos/page.tsx`).
    *   [x] Buat tombol/modal "Tarik Antrean" yang memanggil API `GET /api/v1/order-drafts` (list pending). Tambahkan query parameter `?status=` untuk filter status draft.
    *   [x] Panggil API `POST /api/v1/order-drafts/{id}/lock` ketika kasir memilih satu draf antrean.
    *   [x] Tampilkan isi draf ke keranjang belanja kasir.
    *   [x] Desain keranjang dalam mode terkunci (Kasir tidak bisa tambah/hapus item tanpa bypass PIN Supervisor).

#### Card 2: Pembayaran & Cetak Invoice (Backend)
*   **Description:** Memfinalisasi pembayaran kasir, generate nomor invoice unik, potong stok produk, dan catat metode bayar.
*   **Checklist:**
    *   [x] Buat migration: `transactions`, `transaction_items`, dan `payments`.
    *   [x] Buat endpoint `POST /api/v1/transactions` (Kasir checkout final).
    *   [x] Implementasi generator nomor invoice harian: `TRX-YYYYMMDD-XXXX` (reset ke 0001 setiap hari baru).
    *   [x] Simpan **snapshot** `product_name` dan `unit_price` ke `transaction_items` (bukan referensi dinamis, agar data historis tetap akurat jika harga produk berubah).
    *   [x] Hitung `tax_amount` secara otomatis berdasarkan `stores.tax_rate` saat checkout. Tampilkan rincian pajak di struk/invoice.
    *   [x] Buat logic `PaymentService` untuk mencatat pembayaran (mendukung split payment, tunai/non-tunai).
    *   [x] **Perencanaan Payment Gateway**: Karena belum membeli/berlangganan API payment gateway (Midtrans/Xendit), implementasikan **Standalone Fallback mode** (kasir menginput nomor referensi secara manual untuk EDC/QRIS, dengan kolom `is_standalone_fallback = true` dan `reference_number` tersimpan di database). Sediakan pula Simulator/Mock QRIS dummy di backend untuk demo pembayaran sukses otomatis.
    *   [x] Potong `products.stock_quantity` dan tulis log ke `stock_movements` (`type: sale`, `reference_type: Transaction`) secara atomik dalam DB transaction.
    *   [x] Ubah status order_draft menjadi `completed`.

#### Card 3: Proses Pembayaran & Struk (Frontend)
*   **Description:** Panel kalkulator pembayaran di kasir, split payment, input cash kembalian, dan modal struk PDF.
*   **Checklist:**
    *   [x] Buat form pembayaran di kasir (Input uang tunai, hitung kembalian otomatis).
    *   [x] Tambahkan opsi split payment (misal: sebagian tunai, sebagian QRIS/EDC).
    *   [x] **UI/UX Standalone Payment & QRIS Simulator**: Buat input field manual untuk kode referensi transaksi EDC/QRIS. Tambahkan tombol "Simulasikan Bayar Otomatis" untuk mensimulasikan respons pembayaran berhasil dari QRIS gateway dummy.
    *   [x] Panggil API `POST /api/v1/transactions` ketika pembayaran lunas.
    *   [x] Setelah transaksi sukses, munculkan pop-up modal cetak struk (render struk belanja PDF digital).

---

### 📋 LIST 6: FASE 6 - OTORISASI BYPASS, VOID & AUDIT TRAIL
---
#### Card 1: Verifikasi PIN & Otorisasi Bypass (Backend & Frontend)
*   **Description:** Aksi sensitif kasir membutuhkan otorisasi PIN Supervisor/Manager.
*   **Checklist:**
    *   [x] ~~Buat endpoint API `POST /api/v1/auth/verify-pin` (validasi PIN).~~ *(Sudah diimplementasikan di Fase 1)*
    *   [x] Buat komponen modal PIN otorisasi yang **reusable** di Next.js (`components/PinAuthModal.tsx`) dengan input 6-digit.
    *   [x] Audit dan terapkan middleware `role:` di **setiap** route API sesuai Spesifikasi API (RBAC enforcement).
    *   [x] Integrasikan modal PIN ini pada aksi:
        *   [x] Membuka lock draft keranjang belanja kasir (`POST /api/v1/order-drafts/{id}/unlock`).
        *   [x] Persetujuan stock adjustment oleh Manager (`POST /api/v1/stock-adjustments/{id}/approve`).

#### Card 2: Pembatalan Transaksi / Void (Backend & Frontend)
*   **Description:** Membatalkan transaksi sukses yang sudah dicetak, mengembalikan stok, dan melacak alasan pembatalan.
*   **Checklist:**
    *   [x] Buat endpoint `POST /api/v1/transactions/{id}/void`.
    *   [x] Validasi request wajib mengirimkan PIN Supervisor dan Alasan Void (tidak boleh kosong).
    *   [x] Di database, set status transaksi menjadi `voided`.
    *   [x] Kembalikan stok item produk yang dibatalkan ke jumlah semula dan buat log pergerakan stok masuk (`type: adjustment`).
    *   [x] Catat log audit void ke dalam tabel `audit_logs` secara otomatis.
    *   [x] Tampilkan daftar riwayat transaksi di dashboard kasir dengan tombol "Void Transaksi" yang terlindungi modal PIN Supervisor.

#### Card 3: Log Audit Immutable & Rekonsiliasi (Supervisor/Manager)
*   **Description:** Pencatatan log sistem permanen dan dashboard supervisor untuk mengaudit kas laci kasir.
*   **Checklist:**
    *   [x] Buat migration: `audit_logs` (read-only, tanpa API delete/update).
    *   [x] Buat service class `AuditTrailService` di Laravel untuk mencatat log audit polymorphic (void, update harga, adjustment stok).
    *   [x] Buat endpoint `GET /api/v1/audit-logs` untuk dimuat di panel Manager.
    *   [x] Buat dashboard Rekonsiliasi Shift Supervisor (`POST /api/v1/shifts/{id}/audit`) untuk mencocokkan fisik uang laci kasir vs perhitungan sistem, lalu mencatat selisih (*discrepancy*).

---

### 📋 LIST 7: FASE 7 - DISKON PROMO & MEMBERSHIP
---
#### Card 1: Sistem Membership (Backend & Frontend)
*   **Description:** Registrasi member dan auto-upgrade tier berdasarkan total transaksi belanja.
*   **Checklist:**
    *   [ ] Buat migration: `members`.
    *   [ ] Buat endpoint API:
        *   `POST /api/v1/members` (Registrasi member baru)
        *   `GET /api/v1/members/search` (Cari member via No Telp / Card ID)
    *   [ ] Buat logic penambahan poin belanja di kasir (misal: kelipatan Rp 10.000 dapat 1 poin).
    *   [ ] Buat logic otomatis upgrade tier member (`bronze` -> `silver` -> `gold`) berdasarkan data `members.total_spending`.

#### Card 2: Engine Diskon Promo (Backend)
*   **Description:** Tabel promo fleksibel yang mendukung diskon per-transaksi, produk, atau kategori produk.
*   **Checklist:**
    *   [ ] Buat migration: `discounts`.
    *   [ ] Buat model `Discount` dengan field scope (transaction/product/category), tipe (percentage/fixed_amount), target (all/member_only/tier_specific), dan validitas tanggal.
    *   [ ] Tulis logic di backend: hitung otomatis diskon transaksi/item di endpoint checkout.
    *   [ ] Buat API `GET /api/v1/discounts/active` untuk mendapatkan daftar diskon yang sedang aktif hari ini.

#### Card 3: Manajemen Diskon & Member UI (Frontend)
*   **Description:** Antarmuka frontend untuk pengelolaan diskon oleh manager dan pencarian member di kasir.
*   **Checklist:**
    *   [ ] Buat halaman CRUD diskon di dashboard manager (`src/app/dashboard/manager/discounts/page.tsx`).
    *   [ ] Buat modal pencarian member (via No Telp / Scan Kartu) di halaman POS kasir.
    *   [ ] Integrasikan auto-apply diskon berdasarkan tier member di UI checkout kasir.
    *   [ ] Tampilkan riwayat poin & info tier member di dashboard manager.

---

### 📋 LIST 8: FASE 8 - INTEGRASI, QA & DEPLOYMENT
---
#### Card 1: End-to-End Testing
*   **Description:** Pengujian alur lengkap sistem dari login hingga rekonsiliasi shift.
*   **Checklist:**
    *   [ ] Tulis test script alur lengkap: Login → Buka Shift → Tarik Draft → Checkout → Tutup Shift.
    *   [ ] Verifikasi seluruh perhitungan finansial (subtotal, diskon, pajak, kembalian, discrepancy kas).
    *   [ ] Stress-test concurrent order draft creation (SQLite locking behavior).
    *   [ ] Test alur void transaksi: pengembalian stok, audit log, dan kalkulasi ulang expected cash di shift.

#### Card 2: Security Hardening
*   **Description:** Audit keamanan dan penguatan hak akses sistem.
*   **Checklist:**
    *   [ ] Audit semua endpoint API: pastikan setiap route memiliki middleware `role:` yang sesuai.
    *   [ ] Validasi bahwa tabel `audit_logs` tidak memiliki endpoint `DELETE` atau `UPDATE` di API.
    *   [ ] Test token expiration & force-logout behavior di frontend dan backend.
    *   [ ] Pastikan semua input user ter-sanitasi dan tervalidasi (XSS, SQL injection prevention).

#### Card 3: Deployment Preparation
*   **Description:** Persiapan environment production dan dokumentasi.
*   **Checklist:**
    *   [ ] Dokumentasikan semua environment variables yang dibutuhkan (`.env.example`).
    *   [ ] Setup production build Next.js (`next build`) & Laravel (`php artisan optimize`).
    *   [ ] Tentukan strategi migrasi database (SQLite → MySQL jika diperlukan untuk concurrent write).
    *   [ ] Buat panduan deployment (Docker/Podman compose, reverse proxy, SSL).

---

### 📋 LIST 9: FASE 9 - INTEGRASI PAYMENT GATEWAY (MIDTRANS/XENDIT)
---
#### Card 1: Setup & Integrasi SDK Payment Gateway (Backend)
*   **Description:** Menyiapkan konfigurasi key, merchant id, environment (.env) dan SDK/Library untuk Midtrans atau Xendit di Laravel.
*   **Checklist:**
    *   [ ] Tambahkan environment variables untuk Midtrans/Xendit Sandbox (Merchant ID, Client Key, Server Key).
    *   [ ] Buat config file `config/payment.php` untuk meload variables tersebut.
    *   [ ] Install official SDK Midtrans/Xendit via composer.
    *   [ ] Buat base helper/service class `PaymentGatewayService` dengan method:
        *   `createQrisTransaction(Transaction $transaction)` untuk request snap token / QRIS URL ke provider.
        *   `createCardTransaction(Transaction $transaction)` untuk opsi pembayaran kartu kredit/debit online.

#### Card 2: Webhook Endpoint & Status Check (Backend)
*   **Description:** Endpoint penerima callback / webhook dari payment gateway untuk update status pembayaran transaksi secara realtime & async.
*   **Checklist:**
    *   [ ] Daftarkan route webhook `POST /api/v1/payment/webhook` (bypass auth middleware).
    *   [ ] Implementasikan verifikasi signature webhook dari Midtrans/Xendit untuk mencegah callback palsu.
    *   [ ] Buat logic penanganan status webhook:
        *   Jika status `settlement` atau `capture` (success): update `payments.status` menjadi `success` dan trigger penyelesaian transaksi / update shift expected cash.
        *   Jika status `expire`, `cancel`, `deny`: set `payments.status` menjadi `failed`, batalkan/void parsial transaksi, kembalikan stok.
    *   [ ] Tambahkan endpoint `GET /api/v1/transactions/{id}/payment-status` untuk polling status pembayaran realtime dari frontend.

#### Card 3: Integrasi Pembayaran Realtime & Polling UI (Frontend)
*   **Description:** Menghubungkan proses checkout di UI Kasir dengan API payment gateway dan modal status pembayaran menunggu (polling).
*   **Checklist:**
    *   [ ] Update modal checkout kasir saat memilih QRIS/Debit/Credit: panggil API create transaction dan dapatkan QR Code URL / Snap Token.
    *   [ ] Tampilkan QR Code dinamis dari payment gateway langsung di layar/tablet kasir (atau cetak QR code mini).
    *   [ ] Buat modal status pembayaran "Menunggu Pembayaran..." dengan status check/polling setiap 3-5 detik ke endpoint `GET /transactions/{id}/payment-status`.
    *   [ ] Tampilkan alert sukses dan lanjutkan otomatis ke struk belanja setelah pembayaran terdeteksi lunas (lunas via webhook/polling).
    *   [ ] Sediakan tombol fallback "Konfirmasi Manual / Standalone" jika pembayaran gateway macet / mati.

