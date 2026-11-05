<?php

namespace App\Models;

use App\Core\Database;

class GrindSettings
{
    private const DEFAULTS = [
        'start_balance' => 1000.0,
        'win_amount'    => 40.0,
        'loss_amount'   => 10.0,
        'pnl_mode'      => 'fixed',
    ];

    public static function findByUser(int $userId): array
    {
        $db   = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM grind_settings WHERE user_id = :uid LIMIT 1');
        $stmt->execute([':uid' => $userId]);
        $row  = $stmt->fetch();

        if (!$row) {
            return array_merge(self::DEFAULTS, ['user_id' => $userId]);
        }

        return [
            'user_id'       => (int)   $row['user_id'],
            'start_balance' => (float) $row['start_balance'],
            'win_amount'    => (float) $row['win_amount'],
            'loss_amount'   => (float) $row['loss_amount'],
            'pnl_mode'      => $row['pnl_mode'],
        ];
    }

    public static function upsert(int $userId, array $data): void
    {
        $db  = Database::getInstance();
        $now = date('Y-m-d H:i:s');

        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);

        if ($driver === 'mysql') {
            $stmt = $db->prepare(
                'INSERT INTO grind_settings (user_id, start_balance, win_amount, loss_amount, pnl_mode, created_at, updated_at)
                 VALUES (:uid, :sb, :wa, :la, :mode, :now, :now)
                 ON DUPLICATE KEY UPDATE
                   start_balance = VALUES(start_balance),
                   win_amount    = VALUES(win_amount),
                   loss_amount   = VALUES(loss_amount),
                   pnl_mode      = VALUES(pnl_mode),
                   updated_at    = VALUES(updated_at)'
            );
        } else {
            // SQLite
            $stmt = $db->prepare(
                'INSERT INTO grind_settings (user_id, start_balance, win_amount, loss_amount, pnl_mode, created_at, updated_at)
                 VALUES (:uid, :sb, :wa, :la, :mode, :now, :now)
                 ON CONFLICT(user_id) DO UPDATE SET
                   start_balance = excluded.start_balance,
                   win_amount    = excluded.win_amount,
                   loss_amount   = excluded.loss_amount,
                   pnl_mode      = excluded.pnl_mode,
                   updated_at    = excluded.updated_at'
            );
        }

        $stmt->execute([
            ':uid'  => $userId,
            ':sb'   => $data['start_balance'],
            ':wa'   => $data['win_amount'],
            ':la'   => $data['loss_amount'],
            ':mode' => $data['pnl_mode'],
            ':now'  => $now,
        ]);
    }
}
