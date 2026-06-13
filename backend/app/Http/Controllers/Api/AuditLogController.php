<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Display a listing of system audit logs (Manager only).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Only owner, manager, supervisor or super_admin can read audit logs
        if (!in_array($user->role, ['owner', 'manager', 'supervisor', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Anda tidak memiliki wewenang untuk membaca log audit.'
            ], 403);
        }

        $query = AuditLog::with(['executor', 'authorizer'])
            ->where('store_id', $user->store_id)
            ->orderBy('created_at', 'desc');

        if ($request->has('paginate') && $request->paginate == 'true') {
            $logs = $query->paginate(20);
        } else {
            $logs = $query->limit(100)->get();
        }

        return response()->json([
            'success' => true,
            'message' => 'Log audit sistem berhasil diambil.',
            'data' => $logs
        ]);
    }
}
