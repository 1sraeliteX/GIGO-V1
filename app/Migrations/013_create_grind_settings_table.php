<?php

namespace App\Migrations;

use App\Core\Database;

class CreateGrindSettingsTable
{
    public static function up(): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $db->exec("
                CREATE TABLE IF NOT EXISTS grind_settings (
                    user_id INT PRIMARY KEY,
                    start_balance DECIMAL(15,2) NOT NULL DEFAULT 1000,
                    win_amount DECIMAL(15,2) NOT NULL DEFAULT 40,
                    loss_amount DECIMAL(15,2) NOT NULL DEFAULT 10,
                    pnl_mode VARCHAR(10) NOT NULL DEFAULT 'fixed',
                    market_order TEXT DEFAULT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        } else {
            $db->exec("
                CREATE TABLE IF NOT EXISTS grind_settings (
                    user_id INTEGER PRIMARY KEY,
                    start_balance REAL NOT NULL DEFAULT 1000,
                    win_amount REAL NOT NULL DEFAULT 40,
                    loss_amount REAL NOT NULL DEFAULT 10,
                    pnl_mode TEXT NOT NULL DEFAULT 'fixed' CHECK(pnl_mode IN ('fixed', 'actual')),
                    market_order TEXT DEFAULT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
        }
        echo "Created grind_settings table.\n";
    }

    public static function down(): void
    {
        $db = Database::getInstance();
        $db->exec("DROP TABLE IF EXISTS grind_settings");
        echo "Dropped grind_settings table.\n";
    }
}