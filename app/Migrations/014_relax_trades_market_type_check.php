<?php

namespace App\Migrations;

use App\Core\Database;

/**
 * The original SQLite trades table has CHECK(market_type IN ('forex','crypto','commodities')),
 * which rejects the new 'derived' category. SQLite cannot alter a CHECK constraint,
 * so the table is rebuilt without it (MySQL never had the restriction).
 */
class RelaxTradesMarketTypeCheck
{
    public static function up(): void
    {
        $db = Database::getInstance();
        if ($db->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql') {
            echo "Skipped market_type CHECK relaxation (MySQL has no CHECK on trades).\n";
            return;
        }

        $row = $db->query("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'trades'")->fetch();
        if (!$row || stripos($row['sql'], "CHECK(market_type") === false) {
            echo "Skipped market_type CHECK relaxation (already relaxed).\n";
            return;
        }

        $columns = 'id, user_id, trade_date, market_type, pair, lot_size, risk_type, risk_value, result, pnl_amount, risk_reward, notes, created_at, updated_at, account_id, target_amount, session';

        $db->exec('PRAGMA foreign_keys=OFF');
        $db->beginTransaction();
        try {
            $db->exec("
                CREATE TABLE trades_new (
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
                    notes TEXT DEFAULT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    account_id INTEGER DEFAULT NULL,
                    target_amount REAL DEFAULT NULL,
                    session TEXT DEFAULT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
            $db->exec("INSERT INTO trades_new ({$columns}) SELECT {$columns} FROM trades");
            $db->exec('DROP TABLE trades');
            $db->exec('ALTER TABLE trades_new RENAME TO trades');
            $db->exec('CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, trade_date)');
            $db->exec('CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id)');
            $db->exec('CREATE INDEX IF NOT EXISTS idx_trades_user_account_date ON trades(user_id, account_id, trade_date)');
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            $db->exec('PRAGMA foreign_keys=ON');
            throw $e;
        }
        $db->exec('PRAGMA foreign_keys=ON');
        echo "Rebuilt trades table without market_type CHECK (derived category allowed).\n";
    }

    public static function down(): void
    {
        echo "No rollback for market_type CHECK relaxation.\n";
    }
}