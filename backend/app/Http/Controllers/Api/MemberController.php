<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MemberController extends Controller
{
    /**
     * Display a listing of members.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Member::orderBy('name');

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('phone', 'like', '%' . $search . '%')
                  ->orWhere('member_code', '=', $search);
            });
        }

        $members = $query->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar member berhasil diambil.',
            'data' => $members
        ]);
    }

    /**
     * Store a newly created member in storage.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:members,phone',
            'email' => 'nullable|email|max:255',
        ], [
            'name.required' => 'Nama member harus diisi.',
            'phone.required' => 'Nomor telepon harus diisi.',
            'phone.unique' => 'Nomor telepon sudah terdaftar sebagai member.',
            'email.email' => 'Format email tidak valid.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        // Generate unique member code: MBR-YYYYMMDD-XXXX
        $datePart = now()->format('Ymd');
        $count = Member::whereDate('created_at', now())->count() + 1;
        $memberCode = 'MBR-' . $datePart . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        $member = Member::create([
            'store_id' => $user->store_id,
            'member_code' => $memberCode,
            'name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'points' => 0,
            'total_spending' => 0.00,
            'tier' => 'bronze',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Member baru berhasil didaftarkan.',
            'data' => $member
        ], 201);
    }

    /**
     * Search member by phone or code.
     */
    public function search(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|min:3',
        ], [
            'query.required' => 'Kata kunci pencarian harus diisi.',
            'query.min' => 'Kata kunci pencarian minimal 3 karakter.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $searchQuery = $request->query('query');
        $member = Member::where('phone', '=', $searchQuery)
            ->orWhere('member_code', '=', $searchQuery)
            ->orWhere('name', 'like', '%' . $searchQuery . '%')
            ->first();

        if (!$member) {
            return response()->json([
                'success' => false,
                'message' => 'Member tidak ditemukan.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Member berhasil ditemukan.',
            'data' => $member
        ]);
    }
}
