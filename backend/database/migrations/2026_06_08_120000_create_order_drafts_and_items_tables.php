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
        // Create order_drafts table
        Schema::create('order_drafts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('locked_by')->nullable()->constrained('users')->onDelete('set null');
            $table->string('queue_id')->unique();
            $table->enum('order_type', ['dine_in', 'take_away']);
            $table->string('table_number')->nullable();
            $table->enum('status', ['pending', 'locked', 'completed', 'expired'])->default('pending');
            $table->timestamp('expires_at');
            $table->timestamps();
        });

        // Create order_draft_items table
        Schema::create('order_draft_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_draft_id')->constrained('order_drafts')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->integer('quantity');
            $table->decimal('unit_price', 15, 2);
            $table->decimal('subtotal', 15, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_draft_items');
        Schema::dropIfExists('order_drafts');
    }
};
