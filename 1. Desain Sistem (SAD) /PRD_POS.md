# PRODUCT REQUIREMENTS DOCUMENT (PRD) SISTEM POINT OF SALE (POS)

## Bab 1: Kebutuhan Bisnis & Alur Proses (Business & Process Requirements)

### 1.1 Tujuan Bisnis (Business Objectives)

* **a. Efisiensi Operasional:** Target memangkas waktu transaksi dari rata-rata 2 menit per pelanggan menjadi di bawah 20 detik tergantung banyaknya produk yang dibeli.
* **b. Akurasi Data:** Memastikan data transaksi dan inventaris yang akurat dengan mengurangi kesalahan manual saat melakukan transaksi.
* **c. Kontrol Inventaris:** Mencatat setiap perpindahan stok barang (baik masuk maupun keluar) secara real-time.
* **d. Pelaporan:** Menyediakan data mengenai penjualan, inventaris, dan arus kas.
* **e. Pengalaman Pelanggan:** Menyediakan layanan yang cepat dan akurat.
* **f. Pengurangan Biaya:** Mengurangi kebutuhan tenaga kerja manual.

### 1.2 Persona Pengguna & Hak Akses (User Personas & Role-Based Access)

#### A. Super Admin / Owner (Pemilik Sistem)
* **Tanggung Jawab:** Pemilik bisnis tertinggi yang memiliki kendali mutlak atas seluruh cabang (jika nanti multi-cabang) dan sistem digital.
* **Hak Akses:** 
  * Mengakses semua fitur sistem.
  * Mengonfirmasi Pengaturan Sistem global (Seperti nama toko, pajak, integrasi payment gateway, dan pengaturan toko cabang lainnya).
  * Melihat laporan keuangan tingkat tinggi (Laba bersih, arus kas, margin keuntungan).
  * Mengelola akun manajer Toko dan Kasir (seperti menambah, mengedit, menghapus, memblokir, nonaktifkan).
  * Memantau daftar shift kasir harian dan melihat rincian detail laci kas dari masing-masing kasir.

#### B. Manajer Toko
* **Tanggung Jawab:** Manajer Toko adalah penanggung jawab operasional harian di cabang tersebut.
* **Hak Akses:** 
  * Mengubah harga jual produk (berdasarkan kebijakan pusat/owner).
  * Mengelola akun karyawan di bawahnya (Supervisor, Kasir, Stocker, dll).
  * Melihat laporan penjualan, performa karyawan, dan laporan stok harian.
  * Memantau daftar shift kasir harian dan melihat rincian detail laci kas dari masing-masing kasir.

#### C. Supervisor
* **Tanggung Jawab:** Pengawas langsung di area penjualan (floor) yang menjembatani kasir dan manajer.
* **Hak Akses:** 
  * Otorisasi Khusus (Void): Berhak menyetujui pembatalan item atau pembatalan transaksi yang terlanjur diinput oleh Kasir.
  * Membuka dan menutup shift laci kasir (pencocokan uang fisik awal/akhir).
  * Mengelola transaksi di hari itu (pemberian diskon khusus, dll).
  * Memantau daftar shift harian kasir dan memilih kasir tertentu untuk memantau performa serta memverifikasi/mengaudit laci kas mereka.

#### D. Stocker (Staff Gudang/Logistik)
* **Tanggung Jawab:** Mengontrol arus keluar masuk barang di gudang. Orang ini tidak boleh menyentuh transaksi uang.
* **Hak Akses:** 
  * Menginput barang masuk dari supplier (Restock).
  * Melakukan Adjust Stok dengan Pembatasan: Stocker berhak menyesuaikan jika stok digital dan fisik tidak cocok, dengan syarat:
    * Wajib memilih Reason Code (Alasan: Barang Rusak, Kedaluwarsa, atau Selisih Fisik Opname).
    * Batasan Nominal: Jika total nilai barang yang di-adjust $\le$ Rp 100.000, Stocker bisa eksekusi mandiri. Jika > Rp 100.000, sistem otomatis mengunci (pending) dan membutuhkan Otorisasi PIN Manajer Toko untuk sah menjadi data baru.
    
  * Melakukan Stock Opname (pencocokan stok fisik di gudang vs angka di sistem).
  * Stocker tidak boleh mengakses modul Pembayaran atau Laporan Keuangan.
  * Melihat indikator stok kritis (barang yang hampir habis).

#### E. Pramuniaga (Sales Clerk / Order Taker)
* **Tanggung Jawab:** Membantu pelanggan di area toko atau mencatat pesanan awal melalui tablet/kiosk (seperti kru McDonald's yang mencatat pesanan di antrean) atau role ini bisa menjadi "hanya sebuah layar untuk membantu pelanggan mencari/melihat info produk" saja, seperti kios kiosk informasi.
* **Hak Akses:** 
  * Hanya bisa mengakses fitur "Create Order Draft" (Membuat draf keranjang belanja).
  * Memasukkan produk pilihan pelanggan ke draf, lalu menyimpannya menjadi sebuah nomor antrean atau nomor meja (Nomor antrean untuk take away, Nomor meja untuk dine in).
  * Tidak bisa mengubah harga atau menghapus item yang sudah ada di keranjang. Tugas mereka selesai setelah keranjang "diserahkan" (transfer) ke Kasir.
  * Tidak memiliki akses ke modul Pembayaran atau modul-modul lain yang berkaitan dengan transaksi uang (Modul pembayaran hanya bisa diakses oleh kasir).

#### F. Kasir
* **Tanggung Jawab:** Memproses pembayaran transaksi yang sudah dibuat oleh Pramuniaga.
* **Hak Akses:** 
  * Mengambil data Order Draft yang sudah dibuat oleh Pramuniaga berdasarkan Queue ID / nomor meja.
  * Menerima pembayaran (Tunai, QR, Kartu, dll).
  * Mencetak struk fisik/digital.
  * Tidak bisa mengakses modul Stock atau Laporan Laba Rugi (Hanya Laporan Harian Kasir).
  * **Conditional Void (Aturan Hapus Barang):**
    * **Fase Pra-Bayar:** Berhak menambah, mengurangi, atau menghapus item dari keranjang secara mandiri selama belum menekan tombol "Proses Pembayaran".
    * **Fase Pembayaran:** Begitu masuk ke layar input uang/pembayaran, tombol hapus otomatis terkunci. Jika ada perubahan, wajib memasukkan PIN/Password Supervisor untuk membuka kunci (Void Approval). Sistem wajib mencatat ID Supervisor yang memberikan approval ke dalam log transaksi untuk kebutuhan audit.
  * **Hold & Resume Transaksi:** Berhak "menahan" (hold) keranjang belanja yang sedang aktif jika pelanggan ingin mengambil barang lain yang tertinggal, sehingga kasir bisa melayani antrean di belakangnya terlebih dahulu, lalu "melanjutkan" (resume) kembali transaksi yang tertahan tadi.
  * **Multi-Payment Processing:** Memproses berbagai metode pembayaran yang sah (Tunai, QRIS, Kartu Debit/Kredit) dan menghitung uang kembalian secara otomatis.
  * **Validasi Pelanggan (Membership):** Menginput nomor handphone atau men-scan kartu membership pelanggan untuk menerapkan diskon atau poin otomatis sebelum pembayaran diselesaikan.
  * **Manajemen Shift & Kas Harian:** Menginput "Modal Awal" (Uang pas-pasan di laci) saat membuka shift. 
    * Mencetak Laporan Harian Kasir (Ringkasan total uang masuk berdasarkan metode pembayaran) saat menutup shift untuk diserahkan ke Supervisor.
  * **Batasan Ketat:** Tidak memiliki akses ke modul Stok/Gudang, tidak bisa mengubah harga dasar produk, dan tidak bisa melihat Laporan Laba/Rugi toko.

### 1.3 Alur Proses Bisnis Utama (Core Business Workflows)

#### A. Alur Pemesanan Hingga Pembayaran (Order to Payment)
Alur ketika pesanan diproses hingga pelanggan melakukan pembayaran di meja kasir. Proses ini mengakomodasi dua jalur (Pesanan via Pramuniaga atau Scan Langsung di Kasir).

1. Inisiasi Pesanan (Order Initiation)
    - **Jalur A (Via Pramuniaga):** Kasir membuka modul Kasir, lalu menginput atau men-scan Queue ID (Nomor Antrean) / Nomor Meja yang dibawa pelanggan atau layar pemesanan yang tertera. Sistem otomatis menarik data Order Draft yang sudah dibuat oleh Pramuniaga ke dalam keranjang kasir. 
    - **Jalur B (Langsung di Kasir):** Kasir membuka keranjang baru, lalu men-scan Barcode/SKU atau mencari nama produk secara manual jika pelanggan langsung membawa barang ke meja kasir.
    - **Validasi Stok & Kunci Draft:** Saat menarik data Order Draft (Jalur A), sistem melakukan pengecekan ketersediaan stok riil kembali. Jika ada barang yang kosong/tidak mencukupi, sistem memberikan peringatan. Queue ID yang sedang diproses oleh Kasir A otomatis dikunci agar tidak bisa ditarik oleh kasir lain.
    - **Kedaluwarsa Draft (Draft Expiry):** Order Draft yang tidak diselesaikan dalam batas waktu tertentu (misal 2 jam) akan otomatis kedaluwarsa dan dihapus dari database.

2. Fase Pra-Bayar (Editable Phase):
    - Kasir memeriksa kembali keranjang belanja pelanggan, apakah ada perubahan quantity atau ada yang ingin dihapus/diganti. 
    - Pada fase ini, Kasir diizinkan mengubah jumlah (Quantity) atau menghapus produk dari keranjang secara mandiri jika pelanggan berubah pikiran.
    - Kasir dapat menginput nomor HP/ID Membership pelanggan (jika ada) untuk mengaplikasikan diskon loyalitas otomatis.
    - Sistem otomatis menghitung Subtotal (Harga Jual * Qty), diskon (jika ada), dan Pajak (PPN).

3. Mengunci Transaksi & Fase Pembayaran (Locked Phase):
    - Kasir menekan tombol "Proses Pembayaran".
    - Aturan Conditional Void Active: Sistem otomatis mengunci (freeze) keranjang belanja. Tombol hapus/ubah barang dinonaktifkan.
    - Kondisi Khusus: Jika pelanggan tiba-tiba membatalkan barang pada fase ini, Kasir harus menekan tombol "Buka Kunci", dan sistem akan memunculkan pop-up yang wajib memasukkan PIN/Password Supervisor. Setelah diverifikasi, keranjang terbuka kembali ke Fase Pra-Bayar.
    - Fleksibilitas Metode Pembayaran: Kasir dapat mengganti metode pembayaran (misalnya dari QRIS kembali ke Tunai) secara mandiri tanpa memerlukan PIN Supervisor, selama tidak ada perubahan pada item/jumlah barang di keranjang belanja.

4. Eksekusi Pembayaran (Payment Processing):
    - Kasir memilih metode pembayaran yang diinginkan pelanggan (Tunai, QRIS, atau Kartu).
    - **Split Payment (Pembayaran Terpisah):** Sistem mendukung kombinasi metode pembayaran (misal sebagian Tunai dan sebagian QRIS) dengan menginput nominal untuk masing-masing metode hingga total tagihan terpenuhi.
    - Jika Tunai: Kasir menginput jumlah uang yang diterima, sistem otomatis menghitung Uang Kembalian.
    - Jika QRIS/Kartu: Kasir men-scan kode QR atau memasukkan kartu ke mesin EDC. Sistem menunggu notifikasi sukses dari payment gateway/mesin EDC sebelum melanjutkan.
    - **Mode Standalone / Fallback Non-Tunai:** Jika koneksi EDC/Payment Gateway bermasalah, kasir dapat memilih opsi konfirmasi manual (Standalone) untuk memverifikasi pembayaran secara fisik dan melanjutkan transaksi tanpa tertahan sistem.
    - Kasir menekan tombol "Selesaikan Transaksi".

5. Efek Domino pada Data (PENTING):
Setelah kasir menekan tombol "Selesai/Cetak Struk", sistem secara asynchronous melakukan:
    - Mengubah status Order Draft (jika dari Pramuniaga) menjadi COMPLETED.
    - Memotong stok produk di database secara real-time sesuai Qty yang dibeli.
    - Mencatat nota transaksi baru ke tabel riwayat penjualan (`transactions`).
    - Mencatat aliran kas masuk ke dalam jurnal arus kas shift harian kasir yang aktif.
    - Menambahkan poin ke akun Membership pelanggan (jika ada).
    - Menghapus keranjang belanja aktif yang ada di layar Kasir, sehingga layar siap menerima input transaksi baru.

6. Penyerahan: Kasir memberikan barang belanjaan beserta struk fisik/digital kepada pelanggan.

#### B. Penutupan Shift & Laporan (Closing & Reconciliation)
Alur di akhir hari atau akhir shift untuk memastikan validitas keuangan dan performa toko.

1. Alur Awal Shift (Open Shift & Modal Awal)
    - Kasir A datang dan login ke sistem POS.
    - Sebelum bisa melakukan transaksi pertama, sistem akan mengunci layar dan meminta Kasir A melakukan Open Shift.
    - Kasir A menghitung uang receh/modal di laci fisik yang ditinggalkan manajemen (misal: Rp 200.000 untuk kembalian) dan menginputnya sebagai Modal Awal.
    - Sistem mencatat waktu mulai, ID Kasir, dan membuat satu ID unik: `SHIFT-0001`. Semua transaksi yang dilakukan Kasir A beberapa jam ke depan akan ditempelkan ke ID Shift ini.

2. Alur Pergantian/Akhir Shift (Close Shift & Blind Cash Drop)
    - Jam kerja Kasir A selesai. Kasir A menekan tombol "Tutup Shift".
    - **Proses Blind Cash Drop:** Kasir A menghitung total uang fisik di laci saat itu (termasuk modal + hasil jualan tunai) lalu menginput angka totalnya ke sistem. Kasir A tidak diberi tahu berapa total penjualan yang tercatat di sistem.
    - Setelah input selesai, status `SHIFT-0001` berubah menjadi CLOSED dan Kasir A otomatis logout. Sistem POS di komputer tersebut kembali terkunci.
    - Kasir B datang, login, dan mengulangi proses dari poin 1 (Open Shift baru dengan ID `SHIFT-0002`).

3. Alur Verifikasi & Audit (Oleh Supervisor/Manajer/Owner)
    - Supervisor, Manajer, atau Owner membuka dashboard Shift Monitoring & Audit.
    - Pengguna dapat memilih tanggal tertentu via Date Picker untuk melihat daftar kasir yang bertugas/shift pada hari tersebut (misalnya ada 3 kasir dalam sehari).
    - Pengguna dapat memilih salah satu kasir dari daftar untuk memantau rincian shift-nya secara spesifik.
    - Sistem Laravel menyajikan komparasi otomatis untuk kasir yang dipilih:

$$\text{Ekspektasi Sistem} = \text{Modal Awal} + \text{Total Penjualan Tunai Selama Shift}$$

    - Sistem membandingkan Ekspektasi Sistem dengan Uang Fisik yang Diinput Kasir.
    - Jika Kasir A menginput Rp 1.500.000 padahal sistem menghitung harusnya Rp 1.500.000 $\rightarrow$ Status: Balance (Aman).
    - Jika Kasir A menginput Rp 1.400.000 padahal sistem menghitung harusnya Rp 1.500.000 $\rightarrow$ Status: Discrepancy / Minus Rp 100.000 (Red Flag langsung mengarah ke Kasir A).

*Catatan Tambahan Keandalan Sistem:*
- **Mode Offline (Offline Fallback):** Jika koneksi internet terputus, sistem POS di kasir harus tetap dapat memproses transaksi secara lokal (offline cache) dan melakukan sinkronisasi data (stok, transaksi, poin) ke database cloud secara otomatis setelah koneksi pulih kembali.

### 1.4 Aturan Bisnis & Batasan Sistem (Business Rules & Constraints)

1. **Validasi Stok Mutlak:** Transaksi tidak dapat diproses hingga tahap pembayaran jika jumlah barang di keranjang melebihi stok yang tersedia di database. Sistem wajib memblokir tombol "Proses Pembayaran" dan menampilkan pesan "Stok [Nama Barang] Tidak Mencukupi (Sisa: X)".

2. **Integritas Harga:** Nilai harga jual produk dikunci di tingkat database berdasarkan input Admin/Manajer. Role Kasir dan Pramuniaga sama sekali tidak memiliki akses (baik di UI frontend maupun API backend) untuk memanipulasi harga satuan barang.

3. **Penerapan Conditional Void:** Hak akses penghapusan/pengurangan item setelah tombol "Proses Pembayaran" ditekan hanya diberikan kepada pengguna dengan Role $\ge$ Supervisor melalui verifikasi PIN/Password.

4. **Unique Identity (SKU & Barcode):** Setiap produk wajib memiliki kode unik (SKU/Barcode). Sistem backend Laravel harus menolak (mengembalikan error Validation) jika Admin mencoba memasukkan SKU yang sudah terdaftar di sistem.

5. **Format Nota Otomatis (Invoice Numbering):** Setiap transaksi yang sukses harus menghasilkan nomor invoice unik yang digenerate otomatis oleh backend dengan format: `TRX-YYYYMMDD-XXXX` (Contoh: `TRX-20260606-0001` untuk transaksi pertama di tanggal 6 Juni 2026. Angka urut di belakang otomatis reset menjadi `0001` setiap pergantian hari).

6. **Siklus Hidup Draf (Order Draft Lifecycle):** Order Draft yang dibuat oleh Pramuniaga hanya berlaku pada hari yang sama. Jika tidak diproses oleh Kasir hingga toko tutup, status draf otomatis berubah menjadi EXPIRED dan tidak dapat ditarik lagi oleh Kasir.

7. **Kewajiban Audit Trail (Akuntabilitas Sistem):** Setiap tindakan sensitif yang mengubah nilai keuangan atau inventaris secara tidak normal (seperti Void di fase pembayaran oleh Supervisor, atau Adjust Stok di atas Rp 100.000 oleh Manajer) wajib merekam jejak digital secara permanen di database (audit_logs), meliputi: Timestamp kejadian, ID eksekutor, ID pemberi otorisasi, nama produk, dan nominal perubahan. Data ini tidak boleh bisa dihapus (Read-Only).

---

## Bab 2: Spesifikasi Modul Self-Service Kiosk (Self-Ordering Kiosk)

### 2.1 Tujuan & Ruang Lingkup (Scope & Objective)
Modul Self-Service Kiosk dirancang khusus untuk memotong waktu antrean di kasir fisik dengan mengizinkan pelanggan melakukan pemesanan dan kustomisasi makanan/minuman secara mandiri menggunakan mesin kiosk/tablet vertikal (portrait). Pesanan pelanggan akan tersimpan sebagai **Order Draft** dengan Queue ID unik dan barcode yang nantinya di-scan oleh kasir untuk transaksi pembayaran, atau dibayar langsung di kiosk menggunakan QRIS dinamis.

---

### 2.2 Alur Pengguna (User Flow)

#### A. Langkah 1: Welcome & Order Type Selection
* Layar awal menampilkan visual selamat datang interaktif ("Sentuh Layar Untuk Memulai").
* Pelanggan memilih tipe pesanan: **Dine In** (Makan di Sini) atau **Take Away** (Bawa Pulang).

#### B. Langkah 2: Katalog Menu Utama (Kiosk Catalog)
* Menyajikan kategori produk di bagian atas atau panel kiri dalam bentuk tab visual/ikon berukuran besar.
* Foto produk beresolusi tinggi wajib ditampilkan mendominasi kartu menu untuk menggugah selera pelanggan.
* Setiap kartu menu menampilkan informasi nama makanan, harga dasar, estimasi kalori (opsional), dan indikator ketersediaan stok ("Habis").

#### C. Langkah 3: Modal Kustomisasi (Product Customization)
Ketika menu makanan terpilih memiliki opsi tambahan/kustomisasi, layar modal popup modern akan muncul:
1. **Pilihan Ukuran (Size)**: Pilihan ukuran (misal: *Small*, *Medium*, *Large*) dengan pertambahan harga yang jelas secara real-time.
2. **Pilihan Bahan Dasar (Ingredients/Modifiers)**: Jenis roti, keju, atau tingkat kemanisan/kepedasan.
3. **Tambahan Populer (Add-Ons)**: Ekstra keju, ekstra daging, atau topping tambahan dengan checkbox interaktif (misalnya `[+] Ekstra Keju (+ Rp 3.000)`).
4. **Paket Kombo (Combo Meals)**: Mengubah pesanan satuan menjadi paket kombo (termasuk minuman & makanan pendamping) dengan potongan harga paket otomatis.

#### D. Langkah 4: Tinjauan Keranjang (Review Order)
* Halaman ringkasan semua produk yang dipilih beserta kustomisasinya.
* Pelanggan dapat menambah/mengurangi kuantitas secara visual di baris ringkasan.
* Tombol aksi menonjol: **Selesaikan Pemesanan** atau **Tambah Menu Lain**.

#### E. Langkah 5: Cetak Slip Draf & Barcode
* Setelah selesai, sistem mengirimkan draf pesanan ke database backend.
* Layar Kiosk menampilkan kode antrean (Queue ID) berukuran sangat besar.
* Mesin Kiosk mencetak slip struk kertas berisi Queue ID dan kode barcode untuk dibawa pelanggan ke meja kasir (atau memunculkan QRIS dinamis di layar jika memilih bayar di tempat).

---

### 2.3 Aturan Bisnis & Batasan Fungsional (Business Rules)
1. **Otomatisasi Kunci Stok Sementara**: Saat produk masuk ke keranjang Kiosk, sistem secara dinamis mencadangkan stok selama 15 menit. Jika dalam 15 menit draf tidak dibayar di kasir, cadangan dilepas kembali ke publik.
2. **Kunci Kustomisasi Permanen**: Pilihan kustomisasi (roti, ukuran, topping) dikunci di tingkat draf. Kasir hanya bertugas men-scan dan memproses bayar, tidak diperkenankan mengubah kustomisasi bahan di mesin POS utama tanpa membubuhkan PIN Supervisor (untuk mencegah kecurangan kasir).

---

### 2.4 Panduan UI/UX Kiosk (Self-Service Design Guidelines)
* **Touch Target**: Semua tombol interaktif minimal memiliki ukuran bidang ketukan `48px x 48px` untuk mencegah ketukan salah (fat-finger syndrome).
* **Responsive Layout (Portrait Priority)**: Grid katalog wajib beradaptasi dengan orientasi layar potret vertikal (aspek rasio 9:16 atau 10:16) yang lazim pada mesin kiosk berdiri.
* **Aksesibilitas Mandiri**:
  - Menyediakan opsi **Accessibility Mode** di sudut bawah layar (tombol kontras tinggi, pembesar teks, atau voice-guidance audio).
  - Menyediakan tombol **Batalkan Pesanan / Cancel Order** berwarna merah yang mudah dijangkau di bagian bawah halaman.

---

## Bab 3: Kebutuhan Pengembangan Tahap Lanjut (Future Backlog Requirements)

Bab ini merinci kebutuhan fungsional tambahan untuk pengembangan sistem POS tingkat lanjut guna mendukung ekspansi bisnis, efisiensi pengelolaan, dan skalabilitas sistem.

### 3.1 Dukungan Banyak Toko (Multi-Tenant POS Application)
Sistem harus dikembangkan untuk bertransisi menjadi aplikasi multi-tenant SaaS (Software as a Service) atau multi-cabang terisolasi penuh:
1. **Isolasi Data (Data Isolation):** Seluruh data transaksi, produk, member, dan pengguna harus terisolasi per tenant/toko berdasarkan `store_id` (menggunakan Tenant Scope di backend).
2. **Identifikasi Tenant (Tenant Identification):** Akses masuk ke sistem diidentifikasi melalui subdomain khusus (misal: `toko-a.kepos.id`) atau memasukkan kode unik toko saat masuk sistem pertama kali.
3. **Pendaftaran Toko Baru (Onboarding):** Menyediakan mekanisme bagi pendaftaran tenant/toko baru secara mandiri.

### 3.2 Manajemen Stok Bahan Baku (Raw Material / Non-Saleable Stock)
Untuk mengontrol stok operasional yang bukan merupakan produk akhir siap saji:
1. **Identifikasi Produk:** Setiap item di inventori memiliki flag `is_saleable` (dapat dijual) atau bertipe `raw_material` (bahan baku).
2. **Pengecualian menu kasir & kiosk:** Barang bertipe bahan baku tidak boleh dimuat dalam API penjualan kasir/kiosk dan dilarang muncul di keranjang belanja.
3. **Pencatatan Stok Gudang:** Stocker dapat melakukan restock, adjustment, dan stock opname bahan baku menggunakan modul gudang khusus dengan pencatatan log `stock_movements` yang terpisah.

### 3.3 Pembuatan & Pemantauan Akun oleh Owner (Owner Account Control)
Menambahkan peran (role) tertinggi `owner` sebagai pemilik akun tenant:
1. **Registrasi Akun Mandiri:** Owner dapat membuat akun manajer toko, supervisor, kasir, dan stocker secara mandiri tanpa bantuan developer/administrator sistem.
2. **Pemantauan Real-time (Owner Dashboard):** Menyediakan ringkasan pendapatan harian dari seluruh kasir, log aktivitas sensitif, dan status operasional (buka/tutup shift) secara live.
3. **Manajemen Cabang:** Owner memiliki wewenang untuk menambah cabang toko baru dan menugaskan manajer ke cabang tersebut.

### 3.4 Pagination Sistem Global (Global Server-Side Pagination)
Demi menjaga performa sistem pada volume data yang besar:
1. **Server-Side Rendering:** Seluruh data tabular (produk, riwayat transaksi, audit log, shift kasir) tidak boleh dimuat sekaligus, melainkan menggunakan pembagian per halaman (pagination) di tingkat database backend.
2. **Standardisasi API:** Parameter request wajib menyertakan parameter `page` dan `limit`. Response menyertakan meta informasi halaman (`current_page`, `last_page`, `per_page`, `total`).
3. **Kontrol Interaktif di UI:** Halaman dashboard frontend Next.js wajib menampilkan kontrol pagination yang interaktif (First, Prev, Page Number, Next, Last) dengan URL query state.

### 3.5 Laporan Keuangan Format PDF (Sales & Purchase PDF Reports)
Penyediaan laporan tertulis profesional yang siap unduh dan cetak:
1. **Laporan Penjualan (Sales Report):** Menyajikan total transaksi, subtotal, diskon, pajak, grand total, profit kotor, dan rincian metode pembayaran dalam rentang tanggal tertentu.
2. **Laporan Pembelian (Purchase Report):** Menyajikan rekapitulasi pengeluaran restock barang masuk dari supplier beserta status finansialnya.
3. **Format Dokumen:** Laporan diekspor dalam format dokumen PDF standar, bersih, responsif, dan menyertakan kop nama serta logo toko.
