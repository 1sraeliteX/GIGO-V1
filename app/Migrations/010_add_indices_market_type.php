<?php

namespace App\Migrations;

use App\Core\Database;

/**
 * SQLite CHECK constraints cannot be altered in-place.
 * This migration recreates the trades table without the market_type CHECK
 * so that 'indices' (and any future category) are accepted.
 * For MySQL the CHECK is already permissive (VARCHAR with no CHECK constraint).
 */
class AddIndicesMarketType
{
    public static function up(): void
    {
        $db     = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);

        if ($driver !== 'sqlite') {
            // MySQL has no CHECK constraint on market_type — nothing to do
            echo "AddIndicesMarketType: MySQL — no changes needed.\n";
            return;
        }

        // Check if the existing CHECK constraint needs removing
        $create = $db->query("SELECT sql FROM sqlite_master WHERE type='table' AND name='trades'")->fetchColumn();

        if (!str_contains($create ?? '', "CHECK(market_type IN")) {
            echo "AddIndicesMarketType: CHECK constraint not found — skipping.\n";
            return;
        }

        $db->exec('BEGIN');
        try {
            // 1. Create new table without the market_type CHECK
            $db->exec("
                CREATE TABLE IF NOT EXISTS trades_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    trade_date TEXT NOT NULL,
                    market_type TEXT NOT NULL,
                    pair TEXT NOT NULL,
                    lot_size REAL NOT NULL,
                    risk_type TEXT NOT NULL CHECK(risk_type IN ('amount', 'percentage')),
                    risk_value REAL NOT NULL,
                    result TEXT NOT NULL CHECK(result IN ('win', 'loss')),
                    pnl_amount REAL NOT NULL,
                    risk_reward TEXT NOT NULL,
                    target_amount REAL DEFAULT NULL,
                    notes TEXT DEFAULT NULL,
                    account_id INTEGER DEFAULT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");

            // 2. Copy all existing data
            $db->exec("
                INSERT INTO trades_new
                SELECT id, user_id, trade_date, market_type, pair, lot_size, risk_type, risk_value,
                       result, pnl_amount, risk_reward, target_amount, notes, account_id, created_at, updated_at
                FROM trades
            ");

            // 3. Drop old table, rename new one
            $db->exec('DROP TABLE trades');
            $db->exec('ALTER TABLE trades_new RENAME TO trades');

            // 4. Recreate indexes
            $db->exec('CREATE INDEX IF NOT EXISTS idx_trades_user_id   ON trades (user_id)');
            $db->exec('CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON trades (trade_date)');
            $db->exec('CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades (account_id)');

            $db->exec('COMMIT');
            echo "AddIndicesMarketType: Removed market_type CHECK constraint from trades table.\n";
        } catch (\Throwable $e) {
            $db->exec('ROLLBACK');
            throw $e;
        }
    }

    public static function down(): void
    {
        echo "AddIndicesMarketType: No rollback needed.\n";
    }
}
