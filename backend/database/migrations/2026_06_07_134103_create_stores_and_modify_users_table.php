<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create stores table
        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->decimal('tax_rate', 5, 2)->default(11.00); // 11.00%
            $table->string('timezone')->default('Asia/Jakarta');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Modify users table to add store_id, role, pin, and is_active
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('store_id')->nullable()->constrained('stores')->onDelete('cascade');
            $table->enum('role', ['super_admin', 'manager', 'supervisor', 'kasir', 'pramuniaga', 'stocker'])->default('kasir');
            $table->string('pin', 60)->nullable()->comment('Hashed 6-digit PIN');
            $table->boolean('is_active')->default(true);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['store_id']);
            $table->dropColumn(['store_id', 'role', 'pin', 'is_active']);
        });

        Schema::dropIfExists('stores');
    }
};
