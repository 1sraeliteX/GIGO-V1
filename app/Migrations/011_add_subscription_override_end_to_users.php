<?php

namespace App\Migrations;

use App\Core\Database;

class AddSubscriptionOverrideEndToUsers
{
    public static function up(): void
    {
        $db = Database::getInstance();

        try {
            $db->exec("ALTER TABLE users ADD COLUMN subscription_override_end DATETIME DEFAULT NULL");
            echo "Added subscription_override_end to users table.\n";
        } catch (\Throwable $e) {
            echo "Skipped subscription_override_end (already exists): {$e->getMessage()}\n";
        }
    }

    public static function down(): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $db->exec("ALTER TABLE users DROP COLUMN subscription_override_end");
            echo "Dropped subscription_override_end from users table.\n";
        } else {
            echo "SQLite: DROP COLUMN not supported — skipping.\n";
        }
    }
}
