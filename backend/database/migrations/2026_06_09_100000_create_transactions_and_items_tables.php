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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->onDelete('cascade');
            $table->foreignId('cashier_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('shift_id')->constrained('shifts')->onDelete('cascade');
            $table->foreignId('order_draft_id')->nullable()->constrained('order_drafts')->onDelete('set null');
            $table->unsignedBigInteger('member_id')->nullable(); // We will implement members in Fase 7, make it unsignedBigInteger for now
            $table->unsignedBigInteger('discount_id')->nullable(); // Discounts will be implemented in Fase 7
            $table->string('invoice_number')->unique();
            $table->decimal('subtotal', 15, 2);
            $table->decimal('discount_amount', 15, 2)->default(0.00);
            $table->decimal('tax_amount', 15, 2)->default(0.00);
            $table->decimal('grand_total', 15, 2);
            $table->enum('status', ['completed', 'voided'])->default('completed');
            $table->timestamps();
        });

        Schema::create('transaction_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->unsignedBigInteger('discount_id')->nullable();
            $table->string('product_name'); // snapshot name
            $table->integer('quantity');
            $table->decimal('unit_price', 15, 2); // snapshot price
            $table->decimal('discount_amount', 15, 2)->default(0.00);
            $table->decimal('subtotal', 15, 2);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->onDelete('cascade');
            $table->enum('method', ['cash', 'qris', 'debit_card', 'credit_card']);
            $table->decimal('amount', 15, 2);
            $table->decimal('change_amount', 15, 2)->default(0.00);
            $table->string('reference_number')->nullable();
            $table->boolean('is_standalone_fallback')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('transaction_items');
        Schema::dropIfExists('transactions');
    }
};
