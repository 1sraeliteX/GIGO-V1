<?php

namespace App\Migrations;

use App\Core\Database;

class AddSessionToTrades
{
    public static function up(): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);

        if ($driver === 'mysql') {
            $db->exec("ALTER TABLE trades ADD COLUMN IF NOT EXISTS session VARCHAR(20) DEFAULT NULL");
        } else {
            // SQLite — check if column already exists before adding
            $cols = $db->query("PRAGMA table_info(trades)")->fetchAll();
            $exists = false;
            foreach ($cols as $col) {
                if ($col['name'] === 'session') { $exists = true; break; }
            }
            if (!$exists) {
                $db->exec("ALTER TABLE trades ADD COLUMN session TEXT DEFAULT NULL");
            }
        }
        echo "Added session column to trades table.\n";
    }

    public static function down(): void
    {
        // SQLite does not support DROP COLUMN in older versions; leave as-is.
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $db->exec("ALTER TABLE trades DROP COLUMN IF EXISTS session");
            echo "Dropped session column from trades table.\n";
        } else {
            echo "SQLite: manual column removal required.\n";
        }
    }
}
