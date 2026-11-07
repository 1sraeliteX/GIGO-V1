<?php

namespace App\Models;

use App\Core\Database;

class PaymentSetting
{
    public static function all(): array
    {
        $db = Database::getInstance();
        $rows = $db->query('SELECT setting_key, setting_value FROM payment_settings')->fetchAll();
        $out = [];
        foreach ($rows as $row) {
            $out[$row['setting_key']] = $row['setting_value'];
        }
        return $out;
    }

    public static function save(string $key, ?string $value): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $sql = 'INSERT INTO payment_settings (setting_key, setting_value, updated_at) VALUES (:k, :v, :now)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = VALUES(updated_at)';
        } else {
            $sql = 'INSERT INTO payment_settings (setting_key, setting_value, updated_at) VALUES (:k, :v, :now)
                    ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at';
        }
        $db->prepare($sql)->execute([':k' => $key, ':v' => $value, ':now' => date('Y-m-d H:i:s')]);
    }

    /**
     * Paystack keys: DB (admin-managed) takes precedence over .env/config.
     */
    public static function paystackKeys(): array
    {
        $config = require __DIR__ . '/../../config/config.php';
        $stored = self::all();
        return [
            'public_key' => $stored['paystack_public_key'] ?? $config['paystack']['public_key'],
            'secret_key' => $stored['paystack_secret_key'] ?? $config['paystack']['secret_key'],
        ];
    }
}