<?php

namespace App\Migrations;

use App\Core\Database;

class AddCurrencyToAccounts
{
    public static function up(): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $type = $driver === 'mysql' ? 'VARCHAR(3)' : 'TEXT';
        try {
            $db->exec("ALTER TABLE accounts ADD COLUMN currency {$type} NOT NULL DEFAULT 'USD'");
            echo "Added currency column to accounts.\n";
        } catch (\Throwable $e) {
            echo "Skipped currency (already exists).\n";
        }
    }

    public static function down(): void
    {
        $db = Database::getInstance();
        if ($db->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql') {
            try { $db->exec("ALTER TABLE accounts DROP COLUMN currency"); } catch (\Throwable $e) {}
        }
    }
}
