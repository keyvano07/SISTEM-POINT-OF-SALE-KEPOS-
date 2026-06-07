<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    /**
     * Display a listing of the products.
     */
    public function index(Request $request)
    {
        $query = Product::with('category')->orderBy('name');

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

        $product = Product::create([
            'store_id' => $user->store_id,
            'category_id' => $request->category_id,
            'sku' => $request->sku,
            'barcode' => $request->barcode,
            'name' => $request->name,
            'description' => $request->description,
            'buy_price' => $request->buy_price,
            'sell_price' => $request->sell_price,
            'stock_quantity' => $request->stock_quantity ?? 0,
            'low_stock_threshold' => $request->low_stock_threshold ?? 10,
            'is_active' => $request->is_active ?? true,
        ]);

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

        $product->update([
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
        ]);

        $product->append('is_low_stock');

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil diperbarui.',
            'data' => $product
        ]);
    }
}
