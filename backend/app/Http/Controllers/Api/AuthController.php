<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Handle user login.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah.'
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda dinonaktifkan. Silakan hubungi admin.'
            ], 403);
        }

        // Generate Sanctum Token
        $token = $user->createToken('pos-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'store_id' => $user->store_id,
                ]
            ]
        ], 200);
    }

    /**
     * Handle user logout.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.'
        ], 200);
    }

    /**
     * Verify Supervisor/Manager PIN for action override.
     */
    public function verifyPin(Request $request)
    {
        $request->validate([
            'pin' => 'required|string|size:6',
        ]);

        // Find active users with role super_admin, manager, or supervisor who have a PIN set
        $authorizedUsers = User::whereIn('role', ['super_admin', 'manager', 'supervisor'])
            ->where('is_active', true)
            ->whereNotNull('pin')
            ->get();

        foreach ($authorizedUsers as $user) {
            if (Hash::check($request->pin, $user->pin)) {
                return response()->json([
                    'success' => true,
                    'message' => 'Verifikasi PIN berhasil.',
                    'data' => [
                        'authorized_user_id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role,
                    ]
                ], 200);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'PIN salah atau user tidak memiliki wewenang.'
        ], 403);
    }
}
