<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StoreController extends Controller
{
    /**
     * Display a listing of all stores (tenants).
     */
    public function index(Request $request)
    {
        $stores = Store::orderBy('id', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar toko berhasil diambil.',
            'data' => $stores
        ]);
    }

    /**
     * Store a newly created store in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'timezone' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $store = Store::create([
            'name' => $request->name,
            'address' => $request->address,
            'phone' => $request->phone,
            'tax_rate' => $request->tax_rate ?? 11.00,
            'timezone' => $request->timezone ?? 'Asia/Jakarta',
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Toko baru berhasil ditambahkan.',
            'data' => $store
        ], 201);
    }

    /**
     * Switch the current user's active store.
     */
    public function switchStore(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
        ]);

        $user = $request->user();
        
        // Update user store_id
        $user->store_id = $request->store_id;
        $user->save();

        // Load the new store relationship
        $user->load('store');

        return response()->json([
            'success' => true,
            'message' => 'Berhasil beralih ke toko ' . $user->store->name . '.',
            'data' => [
                'user' => $user
            ]
        ]);
    }
}
