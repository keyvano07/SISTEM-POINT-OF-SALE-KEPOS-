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
        // Add source to order_drafts table
        Schema::table('order_drafts', function (Blueprint $table) {
            $table->enum('source', ['pramuniaga', 'kiosk'])->default('pramuniaga')->after('status');
        });

        // Add customizations to order_draft_items table
        Schema::table('order_draft_items', function (Blueprint $table) {
            $table->json('customizations')->nullable()->after('subtotal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_drafts', function (Blueprint $table) {
            $table->dropColumn('source');
        });

        Schema::table('order_draft_items', function (Blueprint $table) {
            $table->dropColumn('customizations');
        });
    }
};
