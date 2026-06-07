<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use App\Models\Store;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create default store
        $store = Store::create([
            'name' => 'Toko Utama POS',
            'address' => 'Jl. Raya POS No. 1, Jakarta',
            'phone' => '0219876543',
            'tax_rate' => 11.00,
            'timezone' => 'Asia/Jakarta',
            'is_active' => true,
        ]);

        // 2. Create default users for each role

        // Owner / Super Admin (Doesn't need store_id necessarily, but can be set)
        User::create([
            'name' => 'Owner Super Admin',
            'email' => 'owner@toko.com',
            'password' => Hash::make('password123'),
            'role' => 'super_admin',
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // Manager (with PIN 654321)
        User::create([
            'name' => 'Budi Manager',
            'email' => 'manager@toko.com',
            'password' => Hash::make('password123'),
            'role' => 'manager',
            'pin' => Hash::make('654321'),
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // Supervisor (with PIN 123456)
        User::create([
            'name' => 'Siti Supervisor',
            'email' => 'supervisor@toko.com',
            'password' => Hash::make('password123'),
            'role' => 'supervisor',
            'pin' => Hash::make('123456'),
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // Kasir
        User::create([
            'name' => 'Budi Kasir',
            'email' => 'kasir@toko.com',
            'password' => Hash::make('password123'),
            'role' => 'kasir',
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // Pramuniaga
        User::create([
            'name' => 'Anto Pramuniaga',
            'email' => 'pramuniaga@toko.com',
            'password' => Hash::make('password123'),
            'role' => 'pramuniaga',
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // Stocker
        User::create([
            'name' => 'Andi Stocker',
            'email' => 'stocker@toko.com',
            'password' => Hash::make('password123'),
            'role' => 'stocker',
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // 3. Create default categories
        $makanan = \App\Models\Category::create([
            'store_id' => $store->id,
            'name' => 'Makanan'
        ]);

        $minuman = \App\Models\Category::create([
            'store_id' => $store->id,
            'name' => 'Minuman'
        ]);

        $household = \App\Models\Category::create([
            'store_id' => $store->id,
            'name' => 'Kebutuhan Rumah Tangga'
        ]);

        // 4. Create default products
        \App\Models\Product::create([
            'store_id' => $store->id,
            'category_id' => $makanan->id,
            'sku' => 'INDM-GRG-001',
            'barcode' => '89686011162',
            'name' => 'Indomie Goreng',
            'description' => 'Mi Instan goreng rasa original',
            'buy_price' => 2500,
            'sell_price' => 3100,
            'stock_quantity' => 100,
            'low_stock_threshold' => 15,
            'is_active' => true,
        ]);

        \App\Models\Product::create([
            'store_id' => $store->id,
            'category_id' => $minuman->id,
            'sku' => 'AQUA-600-002',
            'barcode' => '8886008101092',
            'name' => 'Aqua Botol 600ml',
            'description' => 'Air mineral kemasan botol sedang',
            'buy_price' => 3000,
            'sell_price' => 4000,
            'stock_quantity' => 50,
            'low_stock_threshold' => 10,
            'is_active' => true,
        ]);

        \App\Models\Product::create([
            'store_id' => $store->id,
            'category_id' => $household->id,
            'sku' => 'RNSP-800-003',
            'barcode' => '8999999042974',
            'name' => 'Rinso Cair 800ml',
            'description' => 'Detergen cair konsentrat',
            'buy_price' => 15000,
            'sell_price' => 18500,
            'stock_quantity' => 20,
            'low_stock_threshold' => 5,
            'is_active' => true,
        ]);
    }
}
