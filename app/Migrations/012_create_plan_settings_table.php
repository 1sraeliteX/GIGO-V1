<?php

namespace App\Migrations;

use App\Core\Database;

class CreatePlanSettingsTable
{
    public static function up(): void
    {
        $db = Database::getInstance();

        $db->exec("CREATE TABLE IF NOT EXISTS plan_settings (id INTEGER PRIMARY KEY AUTO_INCREMENT, plan_key VARCHAR(32) NOT NULL UNIQUE, label VARCHAR(64) NOT NULL, days INTEGER NOT NULL, amount_usd DECIMAL(10,2) NOT NULL, ngn_rate INTEGER NOT NULL DEFAULT 1400, description VARCHAR(255) NOT NULL DEFAULT '', payment_link TEXT DEFAULT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)");

        $stmt = $db->prepare("INSERT IGNORE INTO plan_settings (plan_key, label, days, amount_usd, ngn_rate, description) VALUES ('monthly', 'Monthly', 30, 4, 1400, '30 days of access'), ('quarterly', 'Quarterly', 90, 10, 1400, '90 days of access'), ('yearly', 'Yearly', 365, 30, 1400, '365 days of access')");
        $stmt->execute();

        echo "Created plan_settings table and seeded default plans.\n";
    }

    public static function down(): void
    {
        $db = Database::getInstance();
        $db->exec("DROP TABLE IF EXISTS plan_settings");
        echo "Dropped plan_settings table.\n";
    }
}
