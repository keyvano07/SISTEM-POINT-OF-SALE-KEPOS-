<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class StafManagementController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = $request->user();
        
        $query = User::orderBy('name');

        if ($currentUser->role !== 'super_admin') {
            $query->where('store_id', $currentUser->store_id)
                  ->where('role', '!=', 'super_admin');
        }

        // Search
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Pagination
        if ($request->has('paginate') && $request->paginate == 'true') {
            $users = $query->paginate(10);
        } else {
            $users = $query->get();
        }

        return response()->json([
            'success' => true,
            'message' => 'Daftar staf berhasil diambil.',
            'data' => $users
        ]);
    }

    public function store(Request $request)
    {
        $currentUser = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'pin' => 'nullable|string|digits:6',
            'role' => 'required|string|in:manager,supervisor,kasir,pramuniaga,stocker',
            'is_active' => 'nullable|boolean',
        ], [
            'email.unique' => 'Email ini sudah terdaftar.',
            'pin.digits' => 'PIN harus berupa 6 digit angka.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'pin' => $request->pin ? Hash::make($request->pin) : null,
            'role' => $request->role,
            'store_id' => $currentUser->store_id, // Scope to current tenant's store
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Staf berhasil didaftarkan.',
            'data' => $user
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $currentUser = $request->user();
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Staf tidak ditemukan.'
            ], 404);
        }

        // Tenant Isolation Check
        if ($currentUser->role !== 'super_admin' && $user->store_id !== $currentUser->store_id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak berwenang mengedit staf ini.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'pin' => 'nullable|string|digits:6',
            'role' => 'required|string|in:manager,supervisor,kasir,pramuniaga,stocker',
            'is_active' => 'nullable|boolean',
        ], [
            'email.unique' => 'Email ini sudah terdaftar.',
            'pin.digits' => 'PIN harus berupa 6 digit angka.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = [
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
            'is_active' => $request->is_active ?? $user->is_active,
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        if ($request->has('pin') && !empty($request->pin)) {
            $data['pin'] = Hash::make($request->pin);
        }

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Staf berhasil diperbarui.',
            'data' => $user
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $currentUser = $request->user();
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Staf tidak ditemukan.'
            ], 404);
        }

        // Tenant Isolation Check
        if ($currentUser->role !== 'super_admin' && $user->store_id !== $currentUser->store_id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak berwenang menghapus staf ini.'
            ], 403);
        }

        // Just toggle is_active to false instead of physical deletion
        $user->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Staf berhasil dinonaktifkan.'
        ]);
    }
}
