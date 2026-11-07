<?php

namespace App\Models;

use App\Core\Database;

class GrindSetting
{
    public const DEFAULTS = [
        'start_balance' => 1000.0,
        'win_amount' => 40.0,
        'loss_amount' => 10.0,
        'pnl_mode' => 'fixed',
        'market_order' => null,
    ];

    public static function forUser(int $userId): array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM grind_settings WHERE user_id = :user_id LIMIT 1');
        $stmt->execute([':user_id' => $userId]);
        $row = $stmt->fetch();

        if (!$row) {
            return self::DEFAULTS;
        }

        return [
            'start_balance' => (float) $row['start_balance'],
            'win_amount' => (float) $row['win_amount'],
            'loss_amount' => (float) $row['loss_amount'],
            'pnl_mode' => $row['pnl_mode'],
            'market_order' => $row['market_order'] ? json_decode($row['market_order'], true) : null,
        ];
    }

    public static function save(int $userId, array $settings): array
    {
        $current = self::forUser($userId);
        $merged = array_merge($current, $settings);

        $db = Database::getInstance();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $marketOrder = $merged['market_order'] !== null ? json_encode(array_values($merged['market_order'])) : null;

        if ($driver === 'mysql') {
            $sql = 'INSERT INTO grind_settings (user_id, start_balance, win_amount, loss_amount, pnl_mode, market_order, updated_at)
                    VALUES (:user_id, :start_balance, :win_amount, :loss_amount, :pnl_mode, :market_order, :now)
                    ON DUPLICATE KEY UPDATE start_balance = VALUES(start_balance), win_amount = VALUES(win_amount),
                        loss_amount = VALUES(loss_amount), pnl_mode = VALUES(pnl_mode), market_order = VALUES(market_order), updated_at = VALUES(updated_at)';
        } else {
            $sql = 'INSERT INTO grind_settings (user_id, start_balance, win_amount, loss_amount, pnl_mode, market_order, updated_at)
                    VALUES (:user_id, :start_balance, :win_amount, :loss_amount, :pnl_mode, :market_order, :now)
                    ON CONFLICT(user_id) DO UPDATE SET start_balance = excluded.start_balance, win_amount = excluded.win_amount,
                        loss_amount = excluded.loss_amount, pnl_mode = excluded.pnl_mode, market_order = excluded.market_order, updated_at = excluded.updated_at';
        }

        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':start_balance' => $merged['start_balance'],
            ':win_amount' => $merged['win_amount'],
            ':loss_amount' => $merged['loss_amount'],
            ':pnl_mode' => $merged['pnl_mode'],
            ':market_order' => $marketOrder,
            ':now' => date('Y-m-d H:i:s'),
        ]);

        return self::forUser($userId);
    }
}