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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->onDelete('cascade');
            $table->foreignId('executor_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('authorizer_id')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('action', ['void_unlock', 'stock_adjust_approve', 'stock_adjust_reject', 'price_change']);
            $table->nullableMorphs('target'); // target_type and target_id
            $table->json('details')->nullable(); // JSON object for snapshot before & after changes
            $table->decimal('financial_impact', 15, 2)->default(0.00);
            $table->string('ip_address')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
