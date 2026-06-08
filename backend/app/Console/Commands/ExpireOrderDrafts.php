<?php

namespace App\Console\Commands;

use App\Models\OrderDraft;
use Illuminate\Console\Command;

class ExpireOrderDrafts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'order-drafts:expire';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Otomatis mengubah status draf pesanan yang melewati masa kedaluwarsa (2 jam) menjadi expired';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Memulai pengecekan draf pesanan kedaluwarsa...');

        $expiredCount = OrderDraft::where('status', 'pending')
            ->where('expires_at', '<=', now())
            ->update(['status' => 'expired']);

        $this->info("Pengecekan selesai. {$expiredCount} draf pesanan diubah statusnya menjadi 'expired'.");

        return Command::SUCCESS;
    }
}
