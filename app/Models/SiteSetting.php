<?php

namespace App\Models;

use App\Core\Database;

class SiteSetting
{
    public static function all(): array
    {
        $db = Database::getInstance();
        $rows = $db->query('SELECT setting_key, setting_value FROM site_settings')->fetchAll();
        $out = [];
        foreach ($rows as $row) {
            $out[$row['setting_key']] = $row['setting_value'];
        }
        return $out;
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT setting_value FROM site_settings WHERE setting_key = :k LIMIT 1');
        $stmt->execute([':k' => $key]);
        $row = $stmt->fetch();
        return $row && $row['setting_value'] !== null ? $row['setting_value'] : $default;
    }

    public static function save(string $key, ?string $value): void
    {
        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $sql = 'INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (:k, :v, :now)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = VALUES(updated_at)';
        } else {
            $sql = 'INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (:k, :v, :now)
                    ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at';
        }
        $db->prepare($sql)->execute([':k' => $key, ':v' => $value, ':now' => date('Y-m-d H:i:s')]);
    }
}
