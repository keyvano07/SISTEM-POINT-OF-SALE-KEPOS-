# 🎨 DESIGN SYSTEM KEPOS (Point of Sale)

Dokumen ini mendefinisikan standar UI/UX dan arsitektur frontend untuk aplikasi **KEPOS (Point of Sale)**. Panduan ini dirancang untuk memastikan antarmuka kasir tetap responsif, bebas gangguan visual yang tidak penting, memiliki tingkat keterbacaan yang tinggi, dan meminimalisir kesalahan operasional (human error) selama transaksi berlangsung.

---

## 1. Filosofi Desain POS
Pengalaman pengguna (UX) kasir berfokus pada efisiensi tinggi di bawah tekanan antrean pelanggan. Tiga prinsip utama desain KEPOS adalah:

1. **Kecepatan Input (Speed of Input)**
   - Desain layout memprioritaskan operasional tanpa mouse. Komponen utama harus mendukung navigasi keyboard (tabbing, enter) dan barcode scanning otomatis tanpa perlu klik manual berulang kali.
   
2. **Keterbacaan Tinggi & Kontras Maksimal (High Readability)**
   - Layout menggunakan skema warna kontras tinggi (terutama untuk mode gelap/dark mode) agar teks informasi penting seperti nominal total belanja, nama item, dan jumlah kembalian dapat terbaca sekilas dari jarak 1 meter.

3. **Area Sentuh Luas & Ergonomis (Large Touch Targets)**
   - Semua elemen interaktif (tombol, dropdown, selektor pembayaran) memiliki ukuran target klik/sentuh minimal **48px &times; 48px** untuk mencegah salah sentuh (*fat-finger error*) pada monitor layar sentuh (*touchscreen*).

---

## 2. Sistem Warna (Color Palette)

Sistem warna menggunakan spesifikasi Tailwind CSS untuk memudahkan integrasi kode dengan rasio kontras warna yang memenuhi standar WCAG 2.1 AA.

| Kategori | Nama Warna | Hex Code | Penggunaan Utama |
| :--- | :--- | :--- | :--- |
| **Primary** | Violet 600 | `#7C3AED` | Tombol utama, aksi "Bayar", konfirmasi checkout |
| **Primary Hover** | Violet 700 | `#6D28D9` | State hover pada tombol primary |
| **Secondary** | Indigo 600 | `#4F46E5` | Aksi sekunder (Simpan Draft, Hubungkan EDC) |
| **Accent** | Violet 500/10 | `rgba(139, 92, 246, 0.1)`| Background badge aktif, highlight baris terpilih |
| **Semantic Success**| Emerald 500 | `#10B981` | Notifikasi pembayaran sukses, kas masuk |
| **Semantic Error**  | Rose 500 | `#F43F5E` | Tombol "Batal/Void", peringatan error transaksi |
| **Semantic Warning**| Amber 500 | `#F59E0B` | Status stok menipis (*low stock alert*), pending approval |
| **Semantic Info**   | Sky 500 | `#0EA5E9` | Notifikasi informasi umum, panduan shortcut |
| **Background (Main)**| Slate 950 | `#020617` | Latar belakang layar aplikasi utama |
| **Surface (Card/Box)**| Slate 900 | `#0F172A` | Background keranjang belanja, card produk, modal |
| **Border**          | Slate 800 | `#1E293B` | Garis batas tabel, border input form |
| **Text Primary**    | White | `#FFFFFF` | Judul, nominal besar, teks tombol utama |
| **Text Secondary**  | Slate 400 | `#94A3B8` | Sub-informasi, SKU produk, label form input |
| **Text Muted**      | Slate 500 | `#64748B` | Harga coret, petunjuk placeholder, teks non-aktif |

---

## 3. Tipografi

Sistem tipografi menggunakan font **Geist Sans** (Sans-Serif modern) untuk antarmuka teks umum dan **Geist Mono** (Monospace) untuk angka, harga, kode SKU, dan struk belanja guna memastikan angka sejajar secara vertikal (*tabular figures*) saat dijumlahkan.

### Skala Ukuran Font

- **H1 (Display Nominal)**
  - Ukuran: `2.25rem` (36px) | Weight: `800` (Extra Bold) | Line Height: `2.5rem`
  - Penggunaan: Nominal Total Belanja Utama, Kembalian Tunai.
- **H2 (Section Header)**
  - Ukuran: `1.5rem` (24px) | Weight: `700` (Bold) | Line Height: `2.0rem`
  - Penggunaan: Header Modul, Nama Kasir/Shift, Judul Modal.
- **Body Large (Nama Produk)**
  - Ukuran: `1.125rem` (18px) | Weight: `600` (Semi Bold) | Line Height: `1.75rem`
  - Penggunaan: Nama Item di Keranjang, Nama Produk di Card.
- **Body Medium (Default)**
  - Ukuran: `1.0rem` (16px) | Weight: `400` (Regular) / `500` (Medium)
  - Penggunaan: Teks tabel, label form input, nilai filter kategori.
- **Small (Muted Info)**
  - Ukuran: `0.875rem` (14px) | Weight: `400` (Regular) / `500` (Medium)
  - Penggunaan: Kode SKU/Barcode, waktu transaksi, keterangan stok minimal.

---

## 4. Spesifikasi Komponen Inti

### A. Tombol Kasir (Action Buttons)
Semua tombol memiliki area sentuh minimum setinggi **48px** dengan sudut membulat (*rounded-xl*) sebesar **12px** (`0.75rem`).

```
┌──────────────────────────────────────┐
│            BAYAR / CHECKOUT          │  <- Tinggi: 48px | Sudut: 12px (rounded-xl)
└──────────────────────────────────────┘
```

1. **Primary Button (Aksi Bayar/Selesai)**
   - **Default**: Background `#7C3AED` (Violet 600), Teks Putih `#FFFFFF` (Font Semi Bold).
   - **Hover**: Background `#6D28D9` (Violet 700), transisi 150ms.
   - **Active (Click)**: Background `#5B21B6` (Violet 800), skala 98% (`scale-98`).
   - **Disabled**: Background Slate 800, Teks Slate 500, kursor diblokir (`cursor-not-allowed`).

2. **Danger Button (Aksi Void/Hapus)**
   - **Default**: Background Rose 500/10% (`rgba(244, 63, 94, 0.1)`), Border Rose 500/20%, Teks Rose 400.
   - **Hover**: Background Rose 500/20%, Teks Rose 300.
   - **Disabled**: Tersembunyi atau kursor diblokir dengan opacity 40%.

---

### B. Input Form

1. **Input Pencarian Barang & Barcode**
   - **Tinggi**: 44px
   - **Gaya**: Background Slate 950, Border Slate 800, Teks Putih, Placeholder Slate 500.
   - **State Focus**: Border berubah menjadi Violet 500, ring luar tipis Violet 500 dengan opacity 20%.
   - **Interaktivitas**: Menggunakan *autofocus* pada input pencarian barang secara default saat keranjang kosong.

2. **Input Kuantitas (Quantity Selector)**
   - Menggunakan tombol minus (-) dan plus (+) besar di samping kolom angka untuk mempermudah kasir mengubah kuantitas secara cepat.
   - **Ukuran Tombol**: 40px &times; 40px.

3. **Digital Numpad (Untuk POS Layar Sentuh)**
   - **Dimensi**: Grid 3&times;4 dengan tinggi tombol minimum 56px.
   - **Warna Tombol Angka**: Background Slate 900, Border Slate 800, Hover Slate 800.
   - **Tombol Aksi (Hapus/Clear)**: Background Rose 500/10, Teks Rose 400.

---

### C. Card Produk
Card produk disusun dalam format grid responsif untuk membantu pencarian barang non-barcode secara manual.

- **Dimensi**: Lebar minimal 140px, tinggi minimal 180px.
- **Struktur**:
  1. *Gambar Produk*: Aspek rasio 1:1 (Square), dengan sudut membulat top-lg.
  2. *Nama Produk*: Ukuran 14px (Body Small), maksimal 2 baris (truncation).
  3. *Harga Jual*: Ukuran 16px (Body Medium Bold) menggunakan Font Monospace.
  4. *Badge Stok*: Jika stok menipis (di bawah threshold), tampilkan badge Amber (Warning) di sudut atas gambar.

---

### D. Tabel Keranjang Belanja
Tabel keranjang belanja harus memaksimalkan area vertikal layar dengan membuang kolom yang tidak perlu.

- **Tinggi Baris**: Minimal 56px untuk memudahkan seleksi baris secara manual.
- **Distribusi Kolom**:
  - Kolom 1 (Nama Produk + SKU): Lebar Fleksibel (Kiri).
  - Kolom 2 (Harga Satuan): Lebar Tetap (Kanan - Monospace).
  - Kolom 3 (Kuantitas / Qty): Selector Qty (Tengah).
  - Kolom 4 (Total Harga): Lebar Tetap (Kanan - Monospace).
  - Kolom 5 (Aksi Hapus): Tombol Trash (Tengah).

### E. Sidebar Dashboard
Sidebar diletakkan secara permanen di sisi kiri halaman Dashboard untuk navigasi antar-modul dan manajemen cepat.

- **Dimensi & Perilaku**:
  - *State Expanded (Default)*: Lebar tetap **260px**.
  - *State Collapsed*: Lebar tetap **80px** (hanya menampilkan icon menu) untuk memaksimalkan ruang kerja tabel data.
  - *Transisi*: Efek transisi halus 200ms dengan timing `cubic-bezier(0.4, 0, 0.2, 1)` saat status toggle berubah.
- **Gaya Visual**:
  - Background: Slate 900 (`#0F172A`), dengan batas border kanan tipis Slate 800 (`#1E293B`).
- **Elemen & Interaksi Menu**:
  - *Tinggi Item Menu*: 48px dengan padding horizontal `16px` (expanded) atau terpusat `justify-center` (collapsed).
  - *Active State*: Background Violet 600 dengan opacity 10% (`rgba(124, 58, 237, 0.1)`), warna teks putih `#FFFFFF`, dan garis indikator vertikal di kiri setebal 4px berwarna Violet 600 (`#7C3AED`).
  - *Hover State*: Background Slate 800/50%, warna teks Slate 200.
  - *Role-Based Filtering*: Hanya menampilkan tautan modul yang diotorisasi berdasarkan payload JWT user (misalnya menu "Manajemen Inventori" disembunyikan secara visual dari peran `stocker` dan `kasir`).
- **Footer Profile**:
  - Terletak di dasar sidebar. Menampilkan foto profil bulat kecil (32px), nama user (truncation jika kepanjangan), dan role user. Saat collapsed, hanya menampilkan icon avatar atau inisial nama.

---

## 5. Feedback & Status UX

### A. Pesan Toast / Alert
Toast diposisikan di sisi kanan atas layar dengan autohide selama 3 detik.

1. **Sukses (Barang Ditambahkan)**
   - Background: `#10B981` (Emerald 500) dengan opacity 10%.
   - Border: Emerald 500/20%.
   - Teks: Emerald 400 | Icon: `CheckCircle` hijau.

2. **Gagal (Stok Tidak Cukup / Void Ditolak)**
   - Background: `#F43F5E` (Rose 500) dengan opacity 10%.
   - Border: Rose 500/20%.
   - Teks: Rose 400 | Icon: `AlertTriangle` merah.

---

### B. Status Loading (Transaction Processing)
Untuk mencegah kasir melakukan klik ganda (*double-submit*) saat server sedang memproses pembayaran:

1. **Tombol Loading State**:
   - Teks tombol utama berubah menjadi "Memproses Transaksi...".
   - Menampilkan animasi spinner putar (`Loader2` dari lucide-react) berukuran 16px di dalam tombol.
   - Tombol otomatis di-set ke properti `disabled={true}` untuk mengunci klik.

2. **Overlay Layar Penuh (Full-screen Overlay)**:
   - Jika proses memakan waktu lebih dari 500ms, layar POS akan ditutup oleh lapisan semi-transparan (`bg-black/60` dengan `backdrop-blur-sm`) untuk mencegah kasir menyentuh area keranjang atau merubah input metode pembayaran saat integrasi pembayaran (seperti EDC/QRIS) sedang diverifikasi.
