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
        Schema::create('discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('scope', ['transaction', 'product', 'category']);
            $table->enum('type', ['percentage', 'fixed_amount']);
            $table->decimal('value', 15, 2);
            $table->enum('target', ['all', 'member_only', 'tier_specific'])->default('all');
            $table->enum('target_tier', ['bronze', 'silver', 'gold'])->nullable();
            $table->foreignId('target_product_id')->nullable()->constrained('products')->onDelete('cascade');
            $table->foreignId('target_category_id')->nullable()->constrained('categories')->onDelete('cascade');
            $table->decimal('min_purchase_amount', 15, 2)->default(0.00);
            $table->decimal('max_discount_amount', 15, 2)->nullable();
            $table->dateTime('start_date');
            $table->dateTime('end_date');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discounts');
    }
};
