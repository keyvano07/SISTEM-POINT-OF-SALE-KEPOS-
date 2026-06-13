<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class TenantRegistrationController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            // Store details
            'store_name' => 'required|string|max:255',
            'store_address' => 'nullable|string',
            'store_phone' => 'nullable|string|max:50',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            
            // Owner account details
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'pin' => 'required|string|digits:6',
        ], [
            'email.unique' => 'Email ini sudah terdaftar di sistem.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
            'pin.digits' => 'PIN harus berupa 6 digit angka.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Registrasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $result = DB::transaction(function () use ($request) {
                // 1. Create the store
                $store = Store::create([
                    'name' => $request->store_name,
                    'address' => $request->store_address,
                    'phone' => $request->store_phone,
                    'tax_rate' => $request->tax_rate ?? 11.00,
                    'is_active' => true,
                ]);

                // 2. Create the owner user
                $owner = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => Hash::make($request->password),
                    'pin' => Hash::make($request->pin),
                    'role' => 'owner',
                    'store_id' => $store->id,
                    'is_active' => true,
                ]);

                return compact('store', 'owner');
            });

            return response()->json([
                'success' => true,
                'message' => 'Registrasi toko dan akun owner berhasil!',
                'data' => [
                    'store' => $result['store'],
                    'owner' => [
                        'id' => $result['owner']->id,
                        'name' => $result['owner']->name,
                        'email' => $result['owner']->email,
                        'role' => $result['owner']->role,
                    ]
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat mendaftarkan toko: ' . $e->getMessage()
            ], 500);
        }
    }
}
