<?php

namespace App\Migrations;

use App\Core\Database;

class CreateSiteSettingsTable
{
    public static function up(): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $db->exec("
                CREATE TABLE IF NOT EXISTS site_settings (
                    setting_key VARCHAR(64) PRIMARY KEY,
                    setting_value TEXT DEFAULT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        } else {
            $db->exec("
                CREATE TABLE IF NOT EXISTS site_settings (
                    setting_key TEXT PRIMARY KEY,
                    setting_value TEXT DEFAULT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            ");
        }
        echo "Created site_settings table.\n";
    }

    public static function down(): void
    {
        $db = Database::getInstance();
        $db->exec("DROP TABLE IF EXISTS site_settings");
        echo "Dropped site_settings table.\n";
    }
}
