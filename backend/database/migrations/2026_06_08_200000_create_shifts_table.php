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
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->onDelete('cascade');
            $table->foreignId('cashier_id')->constrained('users')->onDelete('cascade');
            $table->string('shift_code')->unique();
            $table->decimal('opening_cash', 15, 2);
            $table->decimal('physical_cash_input', 15, 2)->nullable();
            $table->decimal('expected_cash', 15, 2)->nullable();
            $table->decimal('discrepancy', 15, 2)->nullable();
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->enum('audit_status', ['pending', 'balance', 'discrepancy'])->default('pending');
            $table->foreignId('audited_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('audit_notes')->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('audited_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
