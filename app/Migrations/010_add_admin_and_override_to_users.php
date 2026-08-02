<?php

namespace App\Migrations;

use App\Core\Database;

class AddAdminAndOverrideToUsers
{
    public static function up(): void
    {
        $db = Database::getInstance();

        try {
            $db->exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
            echo "Added is_admin to users table.\n";
        } catch (\Throwable $e) {
            echo "Skipped is_admin (already exists): {$e->getMessage()}\n";
        }

        try {
            $db->exec("ALTER TABLE users ADD COLUMN subscription_override INTEGER NOT NULL DEFAULT 0");
            echo "Added subscription_override to users table.\n";
        } catch (\Throwable $e) {
            echo "Skipped subscription_override (already exists): {$e->getMessage()}\n";
        }

        // Backfill: all existing users get subscription_override = 1
        // so the "Subscribe to Continue" modal is suppressed for them immediately.
        $affected = $db->exec("UPDATE users SET subscription_override = 1");
        echo "Backfilled subscription_override = 1 for {$affected} existing user(s).\n";
    }

    public static function down(): void
    {
        // SQLite does not support DROP COLUMN on older versions;
        // for MySQL we drop both columns gracefully.
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);

        if ($driver === 'mysql') {
            $db->exec("ALTER TABLE users DROP COLUMN is_admin");
            $db->exec("ALTER TABLE users DROP COLUMN subscription_override");
            echo "Dropped is_admin and subscription_override from users table.\n";
        } else {
            echo "SQLite: DROP COLUMN not supported — skipping down() for this migration.\n";
        }
    }
}
