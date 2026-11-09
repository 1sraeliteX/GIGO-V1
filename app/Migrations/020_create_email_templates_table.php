<?php

namespace App\Migrations;

use App\Core\Database;

class CreateEmailTemplatesTable
{
    public static function up(): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $db->exec("CREATE TABLE IF NOT EXISTS email_templates (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                template_key VARCHAR(64) NOT NULL UNIQUE,
                subject VARCHAR(255) NOT NULL DEFAULT '',
                body TEXT NOT NULL,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } else {
            $db->exec("CREATE TABLE IF NOT EXISTS email_templates (
                id INTEGER PRIMARY KEY,
                template_key TEXT NOT NULL UNIQUE,
                subject TEXT NOT NULL DEFAULT '',
                body TEXT NOT NULL,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )");
        }

        $templates = [
            ['forgot_password', 'Reset your Tradora password',
                "<h2>Password Reset</h2>\n<p>Hello {{name}},</p>\n<p>You requested a password reset. Click the link below to set a new password:</p>\n<p><a href=\"{{reset_link}}\">Reset Password</a></p>\n<p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>"],
            ['welcome', 'Welcome to Tradora!',
                "<h2>Welcome to Tradora!</h2>\n<p>Hello {{name}},</p>\n<p>Your account has been created. Start tracking your trades and building consistency.</p>\n<p><a href=\"{{app_url}}\">Go to Dashboard</a></p>"],
            ['subscription_confirmed', 'Subscription Confirmed',
                "<h2>Payment Successful</h2>\n<p>Hello {{name}},</p>\n<p>Your {{plan}} subscription is now active for {{days}} days.</p>\n<p>Thank you for choosing Tradora!</p>"],
        ];

        $sql = $driver === 'mysql'
            ? 'INSERT IGNORE INTO email_templates (template_key, subject, body) VALUES (?, ?, ?)'
            : 'INSERT OR IGNORE INTO email_templates (template_key, subject, body) VALUES (?, ?, ?)';
        $stmt = $db->prepare($sql);
        foreach ($templates as $t) {
            $stmt->execute($t);
        }
        echo "Created email_templates table and seeded defaults.\n";
    }

    public static function down(): void
    {
        $db = Database::getInstance();
        $db->exec("DROP TABLE IF EXISTS email_templates");
        echo "Dropped email_templates table.\n";
    }
}
