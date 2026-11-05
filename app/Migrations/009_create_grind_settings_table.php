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
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL UNIQUE,
                    start_balance DECIMAL(15,2) NOT NULL DEFAULT 1000.00,
                    win_amount DECIMAL(15,2) NOT NULL DEFAULT 40.00,
                    loss_amount DECIMAL(15,2) NOT NULL DEFAULT 10.00,
                    pnl_mode VARCHAR(10) NOT NULL DEFAULT 'fixed',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        } else {
            $db->exec("
                CREATE TABLE IF NOT EXISTS grind_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL UNIQUE,
                    start_balance REAL NOT NULL DEFAULT 1000.0,
                    win_amount REAL NOT NULL DEFAULT 40.0,
                    loss_amount REAL NOT NULL DEFAULT 10.0,
                    pnl_mode TEXT NOT NULL DEFAULT 'fixed' CHECK(pnl_mode IN ('fixed','actual')),
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
