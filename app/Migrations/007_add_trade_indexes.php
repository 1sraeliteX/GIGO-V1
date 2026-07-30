<?php

namespace App\Migrations;

use App\Core\Database;

class AddTradeIndexes
{
    public static function up(): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $db->exec("CREATE INDEX idx_trades_user_date ON trades(user_id, trade_date)");
            $db->exec("CREATE INDEX idx_trades_account ON trades(account_id)");
            $db->exec("CREATE INDEX idx_trades_user_account_date ON trades(user_id, account_id, trade_date)");
        } else {
            $db->exec("CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, trade_date)");
            $db->exec("CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id)");
            $db->exec("CREATE INDEX IF NOT EXISTS idx_trades_user_account_date ON trades(user_id, account_id, trade_date)");
        }
        echo "Added indexes to trades table.\n";
    }

    public static function down(): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $db->exec("DROP INDEX idx_trades_user_date ON trades");
            $db->exec("DROP INDEX idx_trades_account ON trades");
            $db->exec("DROP INDEX idx_trades_user_account_date ON trades");
        } else {
            $db->exec("DROP INDEX IF EXISTS idx_trades_user_date");
            $db->exec("DROP INDEX IF EXISTS idx_trades_account");
            $db->exec("DROP INDEX IF EXISTS idx_trades_user_account_date");
        }
        echo "Dropped indexes from trades table.\n";
    }
}
