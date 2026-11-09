<?php

namespace App\Migrations;

use App\Core\Database;

class CreateEmailSettingsTable
{
    public static function up(): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $db->exec("CREATE TABLE IF NOT EXISTS email_settings (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                smtp_host VARCHAR(255) NOT NULL DEFAULT '',
                smtp_port INT NOT NULL DEFAULT 587,
                smtp_user VARCHAR(255) NOT NULL DEFAULT '',
                smtp_pass VARCHAR(255) NOT NULL DEFAULT '',
                smtp_secure VARCHAR(10) NOT NULL DEFAULT 'tls',
                from_email VARCHAR(255) NOT NULL DEFAULT '',
                from_name VARCHAR(255) NOT NULL DEFAULT 'Tradora',
                reply_to VARCHAR(255) DEFAULT NULL,
                is_enabled INTEGER NOT NULL DEFAULT 0,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $db->exec("INSERT IGNORE INTO email_settings (id, smtp_host, smtp_port, from_name) VALUES (1, '', 587, 'Tradora')");
        } else {
            $db->exec("CREATE TABLE IF NOT EXISTS email_settings (
                id INTEGER PRIMARY KEY,
                smtp_host TEXT NOT NULL DEFAULT '',
                smtp_port INTEGER NOT NULL DEFAULT 587,
                smtp_user TEXT NOT NULL DEFAULT '',
                smtp_pass TEXT NOT NULL DEFAULT '',
                smtp_secure TEXT NOT NULL DEFAULT 'tls',
                from_email TEXT NOT NULL DEFAULT '',
                from_name TEXT NOT NULL DEFAULT 'Tradora',
                reply_to TEXT DEFAULT NULL,
                is_enabled INTEGER NOT NULL DEFAULT 0,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )");
            $db->exec("INSERT OR IGNORE INTO email_settings (id, smtp_host, smtp_port, from_name) VALUES (1, '', 587, 'Tradora')");
        }
        echo "Created email_settings table.\n";
    }

    public static function down(): void
    {
        $db = Database::getInstance();
        $db->exec("DROP TABLE IF EXISTS email_settings");
        echo "Dropped email_settings table.\n";
    }
}
