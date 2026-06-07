# 🔌 Spesifikasi API (API Contract) — Sistem Point of Sale (POS)

Dokumen ini mendata semua endpoint RESTful API yang disediakan oleh **Laravel Backend** untuk dikonsumsi oleh **Next.js Frontend**.

---

## 1. Standar Format Response API

Semua endpoint wajib mengembalikan data dengan format JSON standar berikut:

### Response Sukses (200 OK / 201 Created)
```json
{
  "success": true,
  "message": "Pesan sukses operasi.",
  "data": {}
}
```

### Response Gagal Validasi (422 Unprocessable Entity)
```json
{
  "success": false,
  "message": "Data yang dikirimkan tidak valid.",
  "errors": {
    "email": ["Format email tidak valid."],
    "pin": ["PIN harus berupa 6 digit angka."]
  }
}
```

### Response Gagal Otorisasi / Error Sistem (401 / 403 / 500)
```json
{
  "success": false,
  "message": "Akses ditolak. Anda tidak memiliki wewenang untuk melakukan aksi ini."
}
```

---

## 2. Kelompok Endpoint API

### A. Cluster 1: Auth & User Management

#### 1. Login User
* **Endpoint:** `POST /api/v1/auth/login`
* **Deskripsi:** Autentikasi user dan pengembalian token Sanctum.
* **Headers:** `Accept: application/json`
* **Request Body:**
  ```json
  {
    "email": "kasir@toko.com",
    "password": "password123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login berhasil.",
    "data": {
      "token": "1|abCDeFgHiJkLmNoP...",
      "user": {
        "id": 2,
        "name": "Budi Kasir",
        "email": "kasir@toko.com",
        "role": "kasir",
        "store_id": 1
      }
    }
  }
  ```

#### 2. Logout User
* **Endpoint:** `POST /api/v1/auth/logout`
* **Deskripsi:** Menghapus token otentikasi aktif saat ini.
* **Headers:** 
  * `Accept: application/json`
  * `Authorization: Bearer {token}`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logout berhasil."
  }
  ```

#### 3. Verifikasi PIN Otorisasi (Supervisor/Manager)
* **Endpoint:** `POST /api/v1/auth/verify-pin`
* **Deskripsi:** Memvalidasi PIN Supervisor atau Manajer untuk mengizinkan tindakan void/diskon/stock adjustment bypass.
* **Headers:**
  * `Accept: application/json`
  * `Authorization: Bearer {token}`
* **Request Body:**
  ```json
  {
    "pin": "123456"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Verifikasi PIN berhasil.",
    "data": {
      "authorized_user_id": 3,
      "name": "Siti Supervisor",
      "role": "supervisor"
    }
  }
  ```

#### 4. List User / Akun Staff (Manager/Owner)
* **Endpoint:** `GET /api/v1/users`
* **Deskripsi:** Mendapatkan daftar user staff cabang.
* **Headers:** `Authorization: Bearer {token}` (Role: `manager` / `super_admin`)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Daftar staff berhasil diambil.",
    "data": [
      {
        "id": 2,
        "name": "Budi Kasir",
        "email": "kasir@toko.com",
        "role": "kasir",
        "is_active": true
      }
    ]
  }
  ```

#### 5. Buat Akun Staff Baru
* **Endpoint:** `POST /api/v1/users`
* **Deskripsi:** Menambahkan staff baru ke sistem.
* **Headers:** `Authorization: Bearer {token}` (Role: `manager` / `super_admin`)
* **Request Body:**
  ```json
  {
    "name": "Andi Stocker",
    "email": "andi@toko.com",
    "password": "securepassword",
    "role": "stocker",
    "pin": "258369"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Akun staff berhasil dibuat.",
    "data": {
      "id": 5,
      "name": "Andi Stocker",
      "email": "andi@toko.com",
      "role": "stocker"
    }
  }
  ```

#### 6. Get Store Settings
* **Endpoint:** `GET /api/v1/store/settings`
* **Deskripsi:** Mengambil pengaturan global toko (pajak, timezone, dll).
* **Headers:** `Authorization: Bearer {token}`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Pengaturan toko berhasil dimuat.",
    "data": {
      "id": 1,
      "name": "Toko Utama POS",
      "address": "Jl. Raya POS No. 1",
      "phone": "0219876543",
      "tax_rate": 11.00,
      "timezone": "Asia/Jakarta"
    }
  }
  ```

#### 7. Update Store Settings (Manager/Owner)
* **Endpoint:** `PUT /api/v1/store/settings`
* **Deskripsi:** Memperbarui konfigurasi global toko.
* **Headers:** `Authorization: Bearer {token}` (Role: `manager` / `super_admin`)
* **Request Body:**
  ```json
  {
    "name": "Toko Utama POS Baru",
    "tax_rate": 12.00
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Pengaturan toko berhasil diperbarui.",
    "data": {
      "id": 1,
      "name": "Toko Utama POS Baru",
      "tax_rate": 12.00
    }
  }
  ```

---

### B. Cluster 2: Inventory & Stock Management

#### 1. List & Cari Produk
* **Endpoint:** `GET /api/v1/products`
* **Deskripsi:** Mendapatkan daftar produk dengan opsi pencarian (SKU, Barcode, Nama) dan pagination.
* **Headers:** `Authorization: Bearer {token}`
* **Query Parameters:**
  * `search` (string, optional) - SKU / Barcode / Nama
  * `category_id` (integer, optional)
  * `page` (integer, default: 1)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Daftar produk berhasil diambil.",
    "data": {
      "current_page": 1,
      "data": [
        {
          "id": 10,
          "category_id": 2,
          "sku": "PROD-001",
          "barcode": "8991234567890",
          "name": "Sabun Cuci Piring Cair",
          "sell_price": 12000.00,
          "stock_quantity": 45,
          "low_stock_threshold": 10,
          "is_active": true
        }
      ],
      "last_page": 5,
      "total": 50
    }
  }
  ```

#### 2. Buat Pengajuan Stock Adjustment (Stocker)
* **Endpoint:** `POST /api/v1/stock-adjustments`
* **Deskripsi:** Stocker mengajukan perubahan jumlah stok karena barang rusak/expired/opname.
* **Headers:** `Authorization: Bearer {token}` (Role: `stocker`)
* **Request Body:**
  ```json
  {
    "product_id": 10,
    "quantity_change": -5,
    "reason_code": "damaged",
    "notes": "Pecah di rak penyimpanan"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Pengajuan stock adjustment berhasil dibuat.",
    "data": {
      "id": 102,
      "product_id": 10,
      "requested_by": 5,
      "quantity_change": -5,
      "financial_value": 60000.00,
      "status": "approved", 
      "notes": "Pecah di rak penyimpanan"
    }
  }
  ```
  *(Catatan: Jika `financial_value` <= 100.000, status otomatis `approved` dan stok langsung dipotong. Jika > 100.000, status diset `pending_approval`)*

#### 3. Approval Stock Adjustment (Manager)
* **Endpoint:** `POST /api/v1/stock-adjustments/{id}/approve`
* **Deskripsi:** Menyetujui pengajuan adjustment yang berstatus `pending_approval`.
* **Headers:** `Authorization: Bearer {token}` (Role: `manager`)
* **Request Body:**
  ```json
  {
    "pin": "654321"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Adjustment disetujui. Stok produk telah diperbarui.",
    "data": {
      "id": 103,
      "status": "approved",
      "approved_by": 1,
      "approved_at": "2026-06-07T17:40:00Z"
    }
  }
  ```

#### 4. Reject Stock Adjustment (Manager)
* **Endpoint:** `POST /api/v1/stock-adjustments/{id}/reject`
* **Deskripsi:** Menolak pengajuan stock adjustment yang diajukan stocker.
* **Headers:** `Authorization: Bearer {token}` (Role: `manager`)
* **Request Body:**
  ```json
  {
    "pin": "654321",
    "notes": "Alasan penolakan: Jumlah fisik masih cocok."
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Pengajuan adjustment berhasil ditolak.",
    "data": {
      "id": 103,
      "status": "rejected",
      "approved_by": 1
    }
  }
  ```

#### 5. List Pengajuan Stock Adjustment
* **Endpoint:** `GET /api/v1/stock-adjustments`
* **Deskripsi:** Mendapatkan daftar pengajuan adjustment untuk review Manager/Supervisor.
* **Headers:** `Authorization: Bearer {token}` (Role: `manager` / `supervisor` / `stocker`)
* **Query Parameters:**
  * `status` (string, optional: `pending_approval`, `approved`, `rejected`)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Daftar adjustment berhasil diambil.",
    "data": [
      {
        "id": 103,
        "product_id": 10,
        "quantity_change": -5,
        "financial_value": 60000.00,
        "status": "pending_approval",
        "requested_by_name": "Andi Stocker"
      }
    ]
  }
  ```

#### 6. Buat Produk Baru (Manager/Owner)
* **Endpoint:** `POST /api/v1/products`
* **Deskripsi:** Menambahkan produk baru ke inventori.
* **Headers:** `Authorization: Bearer {token}` (Role: `manager` / `super_admin`)
* **Request Body:**
  ```json
  {
    "category_id": 2,
    "sku": "PROD-002",
    "barcode": "8991234567891",
    "name": "Minyak Goreng 1L",
    "buy_price": 15000.00,
    "sell_price": 18000.00,
    "stock_quantity": 100,
    "low_stock_threshold": 20
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Produk berhasil ditambahkan.",
    "data": {
      "id": 11,
      "sku": "PROD-002",
      "name": "Minyak Goreng 1L",
      "sell_price": 18000.00
    }
  }
  ```

#### 7. Update Produk & Harga (Manager/Owner)
* **Endpoint:** `PUT /api/v1/products/{id}`
* **Deskripsi:** Memperbarui data produk termasuk harga jual.
* **Headers:** `Authorization: Bearer {token}` (Role: `manager` / `super_admin`)
* **Request Body:**
  ```json
  {
    "name": "Minyak Goreng SunCo 1L",
    "sell_price": 19000.00
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Produk berhasil diperbarui.",
    "data": {
      "id": 11,
      "name": "Minyak Goreng SunCo 1L",
      "sell_price": 19000.00
    }
  }
  ```

---

### C. Cluster 3: Order Draft & Transactions

#### 1. Buat Order Draft (Pramuniaga)
* **Endpoint:** `POST /api/v1/order-drafts`
* **Deskripsi:** Membuat antrean draf pesanan dari tablet pramuniaga.
* **Headers:** `Authorization: Bearer {token}` (Role: `pramuniaga`)
* **Request Body:**
  ```json
  {
    "order_type": "dine_in",
    "table_number": "Meja 12",
    "items": [
      {
        "product_id": 10,
        "quantity": 2
      }
    ]
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Order draft berhasil dibuat.",
    "data": {
      "id": 204,
      "queue_id": "Q-070626-0034",
      "order_type": "dine_in",
      "table_number": "Meja 12",
      "status": "pending",
      "expires_at": "2026-06-07T19:43:15Z"
    }
  }
  ```

#### 2. Kunci / Lock Order Draft (Kasir)
* **Endpoint:** `POST /api/v1/order-drafts/{id}/lock`
* **Deskripsi:** Kasir mengunci draf agar tidak diedit pramuniaga lain saat proses checkout di kasir dimulai.
* **Headers:** `Authorization: Bearer {token}` (Role: `kasir`)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Order draft berhasil dikunci.",
    "data": {
      "id": 204,
      "status": "locked",
      "locked_by": 2
    }
  }
  ```

#### 3. Buka Kunci / Unlock Order Draft (Bypass Otorisasi SPV)
* **Endpoint:** `POST /api/v1/order-drafts/{id}/unlock`
* **Deskripsi:** Membuka kembali status lock draf untuk edit/void item (memerlukan PIN supervisor/manager).
* **Headers:** `Authorization: Bearer {token}` (Role: `kasir`)
* **Request Body:**
  ```json
  {
    "pin": "123456"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Kunci draft berhasil dibuka.",
    "data": {
      "id": 204,
      "status": "pending"
    }
  }
  ```

#### 4. List Active Order Drafts (Kasir)
* **Endpoint:** `GET /api/v1/order-drafts`
* **Deskripsi:** Mendapatkan daftar draf pesanan aktif yang siap ditarik kasir.
* **Headers:** `Authorization: Bearer {token}` (Role: `kasir`)
* **Query Parameters:**
  * `status` (string, default: `pending`)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Daftar order draft berhasil dimuat.",
    "data": [
      {
        "id": 204,
        "queue_id": "Q-070626-0034",
        "order_type": "dine_in",
        "table_number": "Meja 12",
        "status": "pending",
        "created_by_name": "Anto Pramuniaga"
      }
    ]
  }
  ```

#### 5. Get Detail Order Draft
* **Endpoint:** `GET /api/v1/order-drafts/{id}`
* **Deskripsi:** Mendapatkan detail isi item dari draft tertentu.
* **Headers:** `Authorization: Bearer {token}`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Detail order draft berhasil dimuat.",
    "data": {
      "id": 204,
      "queue_id": "Q-070626-0034",
      "order_type": "dine_in",
      "table_number": "Meja 12",
      "items": [
        {
          "product_id": 10,
          "product_name": "Sabun Cuci Piring Cair",
          "quantity": 2,
          "unit_price": 12000.00,
          "subtotal": 24000.00
        }
      ]
    }
  }
  ```

#### 6. Update Order Draft (Edit Keranjang / Void Item)
* **Endpoint:** `PUT /api/v1/order-drafts/{id}`
* **Deskripsi:** Memperbarui item di dalam draf (misal menambah/mengurangi qty setelah di-unlock oleh SPV).
* **Headers:** `Authorization: Bearer {token}` (Role: `kasir` / `pramuniaga`)
* **Request Body:**
  ```json
  {
    "items": [
      {
        "product_id": 10,
        "quantity": 1
      }
    ]
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Order draft berhasil diperbarui.",
    "data": {
      "id": 204,
      "items": [
        {
          "product_id": 10,
          "quantity": 1,
          "subtotal": 12000.00
        }
      ]
    }
  }
  ```

#### 4. Proses Final Transaksi Penjualan
* **Endpoint:** `POST /api/v1/transactions`
* **Deskripsi:** Memfinalisasi pembayaran kasir, memotong stok secara real-time, menambah poin member, dan mencetak invoice.
* **Headers:** `Authorization: Bearer {token}` (Role: `kasir`)
* **Request Body:**
  ```json
  {
    "shift_id": 5,
    "order_draft_id": 204,
    "member_id": 1,
    "discount_id": 3,
    "subtotal": 24000.00,
    "discount_amount": 2400.00,
    "tax_amount": 2160.00,
    "grand_total": 23760.00,
    "payments": [
      {
        "method": "cash",
        "amount": 50000.00,
        "change_amount": 26240.00
      }
    ]
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Transaksi berhasil disimpan.",
    "data": {
      "id": 5012,
      "invoice_number": "TRX-20260607-0012",
      "grand_total": 23760.00,
      "status": "completed",
      "created_at": "2026-06-07T17:45:00Z"
    }
  }
  ```

#### 5. Void Transaksi Selesai
* **Endpoint:** `POST /api/v1/transactions/{id}/void`
* **Deskripsi:** Membatalkan transaksi yang sudah sukses dicetak (Wajib otorisasi PIN dan menuliskan alasan). Aksi ini akan mengembalikan stok produk semula.
* **Headers:** `Authorization: Bearer {token}` (Role: `kasir`)
* **Request Body:**
  ```json
  {
    "pin": "123456",
    "reason": "Salah input jumlah barang oleh kasir"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Transaksi berhasil di-void. Stok barang dikembalikan.",
    "data": {
      "id": 5012,
      "status": "voided",
      "voided_at": "2026-06-07T17:47:00Z"
    }
  }
  ```

---

### D. Cluster 4: Shift & Rekonsiliasi Kas

#### 1. Open Shift (Kasir)
* **Endpoint:** `POST /api/v1/shifts/open`
* **Deskripsi:** Kasir membuka shift dengan memasukkan jumlah modal awal laci kas.
* **Headers:** `Authorization: Bearer {token}` (Role: `kasir`)
* **Request Body:**
  ```json
  {
    "opening_cash": 100000.00
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Shift berhasil dibuka.",
    "data": {
      "id": 5,
      "shift_code": "SHIFT-20260607-0002",
      "cashier_id": 2,
      "opening_cash": 100000.00,
      "status": "open",
      "opened_at": "2026-06-07T08:00:00Z"
    }
  }
  ```

#### 2. Close Shift (Kasir - Blind Cash Drop)
* **Endpoint:** `POST /api/v1/shifts/close`
* **Deskripsi:** Kasir menutup shift dengan memasukkan hitungan fisik uang laci (tanpa melihat expected cash sistem). Kasir akan otomatis logout setelah API ini sukses.
* **Headers:** `Authorization: Bearer {token}` (Role: `kasir`)
* **Request Body:**
  ```json
  {
    "shift_id": 5,
    "physical_cash_input": 1250000.00
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Shift berhasil ditutup. Sistem telah mencatat input laci kas."
  }
  ```

#### 3. Audit Rekonsiliasi Shift (Supervisor/Manager)
* **Endpoint:** `POST /api/v1/shifts/{id}/audit`
* **Deskripsi:** Supervisor membandingkan expected cash hasil kalkulasi sistem vs input fisik kasir, lalu mencatat status audit.
* **Headers:** `Authorization: Bearer {token}` (Role: `supervisor` / `manager`)
* **Request Body:**
  ```json
  {
    "audit_status": "discrepancy", 
    "audit_notes": "Selisih kurang Rp 5.000 karena kesalahan pengembalian receh."
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Audit shift berhasil diselesaikan.",
    "data": {
      "id": 5,
      "expected_cash": 1255000.00,
      "physical_cash_input": 1250000.00,
      "discrepancy": -5000.00,
      "audit_status": "discrepancy",
      "audited_by": 3,
      "audited_at": "2026-06-07T18:00:00Z"
    }
  }
  ```

#### 4. Check Active Shift Status (Kasir)
* **Endpoint:** `GET /api/v1/shifts/active`
* **Deskripsi:** Memeriksa apakah kasir yang login saat ini memiliki shift yang sedang aktif/terbuka.
* **Headers:** `Authorization: Bearer {token}` (Role: `kasir`)
* **Response (200 OK - Shift Aktif):**
  ```json
  {
    "success": true,
    "message": "Shift aktif ditemukan.",
    "data": {
      "id": 5,
      "shift_code": "SHIFT-20260607-0002",
      "opening_cash": 100000.00,
      "status": "open"
    }
  }
  ```
* **Response (200 OK - Tidak Ada Shift Aktif):**
  ```json
  {
    "success": true,
    "message": "Tidak ada shift aktif untuk kasir ini.",
    "data": null
  }
  ```

---

### E. Cluster 5: Membership & Diskon Promo

#### 1. Registrasi Member Baru
* **Endpoint:** `POST /api/v1/members`
* **Deskripsi:** Mendaftarkan member baru untuk mendapatkan poin reward belanja.
* **Headers:** `Authorization: Bearer {token}`
* **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "phone": "081298765432"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Pendaftaran member berhasil.",
    "data": {
      "id": 12,
      "name": "Jane Doe",
      "phone": "081298765432",
      "points": 0,
      "tier": "bronze"
    }
  }
  ```

#### 2. Cari Member via No Telepon / Scan Kartu
* **Endpoint:** `GET /api/v1/members/search`
* **Deskripsi:** Mencari data member untuk ditempelkan pada transaksi keranjang kasir.
* **Headers:** `Authorization: Bearer {token}`
* **Query Parameters:**
  * `q` (string, required) - Nomor Telepon atau Card Number
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Data member ditemukan.",
    "data": {
      "id": 1,
      "name": "John Doe",
      "phone": "081234567890",
      "points": 350,
      "tier": "silver"
    }
  }
  ```

#### 3. List Diskon Aktif
* **Endpoint:** `GET /api/v1/discounts/active`
* **Deskripsi:** Mendapatkan daftar diskon promo yang sedang berjalan dan bisa diterapkan ke transaksi.
* **Headers:** `Authorization: Bearer {token}`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Daftar diskon aktif berhasil dimuat.",
    "data": [
      {
        "id": 3,
        "name": "Promo Member Silver",
        "type": "percentage",
        "value": 10.00,
        "scope": "transaction",
        "min_purchase": 50000.00,
        "target": "tier_specific",
        "target_tier": "silver"
      }
    ]
  }
  ```

---

### F. Cluster 6: Audit Trail & Security Logs (Supervisor/Manager)

#### 1. List Audit Logs (Security Tracking)
* **Endpoint:** `GET /api/v1/audit-logs`
* **Deskripsi:** Mendapatkan log aktivitas sensitif di sistem (void, price change, stock adjustments). Hanya bisa diakses oleh Supervisor, Manager, atau SuperAdmin.
* **Headers:** `Authorization: Bearer {token}` (Role: `supervisor` / `manager` / `super_admin`)
* **Query Parameters:**
  * `action` (string, optional - `void_unlock`, `price_change`, etc)
  * `page` (integer, default: 1)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Daftar audit log berhasil diambil.",
    "data": {
      "current_page": 1,
      "data": [
        {
          "id": 15,
          "executor_name": "Budi Kasir",
          "authorizer_name": "Siti Supervisor",
          "action": "void_unlock",
          "target_type": "transactions",
          "target_id": 5012,
          "details": {
            "invoice_number": "TRX-20260607-0012",
            "reason": "Salah input jumlah barang oleh kasir"
          },
          "financial_impact": -23760.00,
          "ip_address": "192.168.1.50",
          "created_at": "2026-06-07T17:47:00Z"
        }
      ],
      "total": 1
    }
  }
  ```
