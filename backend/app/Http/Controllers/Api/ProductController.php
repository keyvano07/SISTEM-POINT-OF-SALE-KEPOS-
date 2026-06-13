<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductRecipe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    /**
     * Display a listing of the products.
     */
    public function index(Request $request)
    {
        $query = Product::with(['category', 'recipes.ingredient'])->orderBy('name');

        // Search by name, SKU, or Barcode
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('sku', 'like', '%' . $search . '%')
                  ->orWhere('barcode', '=', $search);
            });
        }

        // Filter by Category
        if ($request->has('category_id') && !empty($request->category_id)) {
            $query->where('category_id', $request->category_id);
        }

        // Filter for POS / Sales or Kiosk: hide non-saleable / raw materials
        // By default, if the request is from a kiosk or a cashier POS, show only finished goods for sale.
        // If they explicitly want raw materials (e.g., stocker/management), they can pass show_all=true or product_type=raw_material.
        if ($request->has('product_type')) {
            $query->where('product_type', $request->product_type);
        } elseif (!$request->boolean('show_all', false)) {
            $query->where('product_type', 'finished_good')
                  ->where('is_saleable', true);
        }

        if ($request->has('is_saleable')) {
            $query->where('is_saleable', $request->boolean('is_saleable'));
        }

        // Optional pagination (default: all active/inactive)
        if ($request->has('paginate') && $request->paginate == 'true') {
            $products = $query->paginate(15);
        } else {
            $products = $query->get();
        }

        // Append low stock dynamic attribute
        $products->each(function(\App\Models\Product $product) {
            $product->append('is_low_stock');
        });

        return response()->json([
            'success' => true,
            'message' => 'Daftar produk berhasil diambil.',
            'data' => $products
        ]);
    }

    /**
     * Store a newly created product in storage.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['super_admin', 'manager'])) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki wewenang untuk menambah produk.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'category_id' => 'required|exists:categories,id',
            'sku' => 'required|string|max:100|unique:products,sku',
            'barcode' => 'required|string|max:100|unique:products,barcode',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'buy_price' => 'required|numeric|min:0',
            'sell_price' => 'required|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'image_url' => 'nullable|string|max:1000',
            'product_type' => 'nullable|in:finished_good,raw_material',
            'is_saleable' => 'nullable|boolean',
            'recipes' => 'nullable|array',
            'recipes.*.ingredient_id' => 'required|exists:products,id',
            'recipes.*.quantity' => 'required|numeric|min:0.0001',
        ], [
            'category_id.required' => 'Kategori produk harus dipilih.',
            'category_id.exists' => 'Kategori tidak valid.',
            'sku.required' => 'SKU harus diisi.',
            'sku.unique' => 'SKU sudah terdaftar.',
            'barcode.required' => 'Barcode harus diisi.',
            'barcode.unique' => 'Barcode sudah terdaftar.',
            'name.required' => 'Nama produk harus diisi.',
            'buy_price.required' => 'Harga beli harus diisi.',
            'buy_price.numeric' => 'Harga beli harus berupa angka.',
            'sell_price.required' => 'Harga jual harus diisi.',
            'sell_price.numeric' => 'Harga jual harus berupa angka.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $imageUrl = $request->image_url;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $imageUrl = asset('storage/' . $path);
        }

        if (empty($imageUrl)) {
            $imageUrl = $this->getRandomProductImage($request->name);
        }

        $product = Product::create([
            'store_id' => $user->store_id,
            'category_id' => $request->category_id,
            'sku' => $request->sku,
            'barcode' => $request->barcode,
            'name' => $request->name,
            'description' => $request->description,
            'image_url' => $imageUrl,
            'buy_price' => $request->buy_price,
            'sell_price' => $request->sell_price,
            'stock_quantity' => $request->stock_quantity ?? 0,
            'low_stock_threshold' => $request->low_stock_threshold ?? 10,
            'is_active' => $request->is_active ?? true,
            'product_type' => $request->product_type ?? 'finished_good',
            'is_saleable' => $request->is_saleable ?? ($request->product_type === 'raw_material' ? false : true),
        ]);

        if ($request->has('recipes')) {
            foreach ($request->recipes as $recipeItem) {
                ProductRecipe::create([
                    'store_id' => $user->store_id,
                    'product_id' => $product->id,
                    'ingredient_id' => $recipeItem['ingredient_id'],
                    'quantity' => $recipeItem['quantity'],
                ]);
            }
        }

        $product->load('recipes.ingredient');
        $product->append('is_low_stock');

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil ditambahkan.',
            'data' => $product
        ], 201);
    }

    /**
     * Update the specified product in storage.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['super_admin', 'manager'])) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki wewenang untuk mengubah produk.'
            ], 403);
        }

        $product = Product::find($id);
        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'category_id' => 'required|exists:categories,id',
            'sku' => 'required|string|max:100|unique:products,sku,' . $id,
            'barcode' => 'required|string|max:100|unique:products,barcode,' . $id,
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'buy_price' => 'required|numeric|min:0',
            'sell_price' => 'required|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'image_url' => 'nullable|string|max:1000',
            'product_type' => 'nullable|in:finished_good,raw_material',
            'is_saleable' => 'nullable|boolean',
            'recipes' => 'nullable|array',
            'recipes.*.ingredient_id' => 'required|exists:products,id',
            'recipes.*.quantity' => 'required|numeric|min:0.0001',
        ], [
            'category_id.required' => 'Kategori produk harus dipilih.',
            'category_id.exists' => 'Kategori tidak valid.',
            'sku.required' => 'SKU harus diisi.',
            'sku.unique' => 'SKU sudah terdaftar.',
            'barcode.required' => 'Barcode harus diisi.',
            'barcode.unique' => 'Barcode sudah terdaftar.',
            'name.required' => 'Nama produk harus diisi.',
            'buy_price.required' => 'Harga beli harus diisi.',
            'buy_price.numeric' => 'Harga beli harus berupa angka.',
            'sell_price.required' => 'Harga jual harus diisi.',
            'sell_price.numeric' => 'Harga jual harus berupa angka.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $imageUrl = $request->image_url;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $imageUrl = asset('storage/' . $path);
        }

        $oldSellPrice = $product->sell_price;
        $oldBuyPrice = $product->buy_price;

        $updateData = [
            'category_id' => $request->category_id,
            'sku' => $request->sku,
            'barcode' => $request->barcode,
            'name' => $request->name,
            'description' => $request->description,
            'buy_price' => $request->buy_price,
            'sell_price' => $request->sell_price,
            'stock_quantity' => $request->stock_quantity ?? $product->stock_quantity,
            'low_stock_threshold' => $request->low_stock_threshold ?? $product->low_stock_threshold,
            'is_active' => $request->is_active ?? $product->is_active,
            'product_type' => $request->product_type ?? $product->product_type,
            'is_saleable' => $request->has('is_saleable') ? $request->boolean('is_saleable') : $product->is_saleable,
        ];

        if ($imageUrl !== null) {
            $updateData['image_url'] = $imageUrl;
        }

        $product->update($updateData);

        if ($request->has('recipes')) {
            ProductRecipe::where('product_id', $product->id)->delete();
            foreach ($request->recipes as $recipeItem) {
                ProductRecipe::create([
                    'store_id' => $user->store_id,
                    'product_id' => $product->id,
                    'ingredient_id' => $recipeItem['ingredient_id'],
                    'quantity' => $recipeItem['quantity'],
                ]);
            }
        }

        $newSellPrice = $product->sell_price;
        $newBuyPrice = $product->buy_price;

        if ((float)$oldSellPrice != (float)$newSellPrice || (float)$oldBuyPrice != (float)$newBuyPrice) {
            try {
                $auditTrailService = resolve(\App\Services\AuditTrailService::class);
                $auditTrailService->log(
                    $user,
                    'price_change',
                    $product,
                    null,
                    [
                        'product_name' => $product->name,
                        'old_buy_price' => (float)$oldBuyPrice,
                        'new_buy_price' => (float)$newBuyPrice,
                        'old_sell_price' => (float)$oldSellPrice,
                        'new_sell_price' => (float)$newSellPrice,
                        'changed_at' => now()->toIso8601String()
                    ]
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Gagal menulis audit log price change: ' . $e->getMessage());
            }
        }

        $product->load('recipes.ingredient');
        $product->append('is_low_stock');

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil diperbarui.',
            'data' => $product
        ]);
    }

    /**
     * Get a random product image based on name keywords.
     */
    private function getRandomProductImage($name)
    {
        $nameLower = strtolower($name);
        
        if (str_contains($nameLower, 'indomie') || str_contains($nameLower, 'mie') || str_contains($nameLower, 'noodle') || str_contains($nameLower, 'makanan') || str_contains($nameLower, 'food')) {
            $images = [
                'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&h=400&fit=crop&q=80',
            ];
            return $images[array_rand($images)];
        }
        
        if (str_contains($nameLower, 'aqua') || str_contains($nameLower, 'botol') || str_contains($nameLower, 'minum') || str_contains($nameLower, 'drink') || str_contains($nameLower, 'water') || str_contains($nameLower, 'cair')) {
            $images = [
                'https://images.unsplash.com/photo-1608885898957-a599fb1b1a44?w=400&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1527960659-54817a1f4b82?w=400&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=400&fit=crop&q=80',
            ];
            return $images[array_rand($images)];
        }
        
        if (str_contains($nameLower, 'rinso') || str_contains($nameLower, 'detergen') || str_contains($nameLower, 'sabun') || str_contains($nameLower, 'soap') || str_contains($nameLower, 'clean') || str_contains($nameLower, 'cuci')) {
            $images = [
                'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&h=400&fit=crop&q=80',
            ];
            return $images[array_rand($images)];
        }
        
        $defaults = [
            'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop&q=80',
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&q=80',
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&q=80',
        ];
        return $defaults[array_rand($defaults)];
    }
}
