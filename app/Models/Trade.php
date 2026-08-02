<?php

namespace App\Models;

use App\Core\Database;

class Trade
{
    public static function findByUserAndMonth(int $userId, string $month, ?int $accountId = null): array
    {
        $db = Database::getInstance();
        $sql = 'SELECT * FROM trades WHERE user_id = :user_id AND trade_date LIKE :month_prefix';
        $params = [':user_id' => $userId, ':month_prefix' => $month . '-%'];

        if ($accountId !== null) {
            $sql .= ' AND account_id = :account_id';
            $params[':account_id'] = $accountId;
        }

        $sql .= ' ORDER BY trade_date DESC, created_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM trades WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $trade = $stmt->fetch();
        return $trade ?: null;
    }

    public static function countByUserAndDate(int $userId, string $date): int
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM trades WHERE user_id = :user_id AND trade_date = :date');
        $stmt->execute([':user_id' => $userId, ':date' => $date]);
        return (int) ($stmt->fetch()['cnt'] ?? 0);
    }

    // Count trades for a specific account on a specific date — used for per-account daily limit enforcement.
    public static function countByUserDateAndAccount(int $userId, string $date, int $accountId): int
    {
        $db = Database::getInstance();
        $stmt = $db->prepare(
            'SELECT COUNT(*) as cnt FROM trades WHERE user_id = :user_id AND trade_date = :date AND account_id = :account_id'
        );
        $stmt->execute([':user_id' => $userId, ':date' => $date, ':account_id' => $accountId]);
        return (int) ($stmt->fetch()['cnt'] ?? 0);
    }

    public static function create(int $userId, array $data): int
    {
        $now = date('Y-m-d H:i:s');
        $db = Database::getInstance();
        $stmt = $db->prepare(
            'INSERT INTO trades (user_id, trade_date, market_type, pair, lot_size, risk_type, risk_value, result, pnl_amount, risk_reward, target_amount, notes, account_id, session, created_at, updated_at)
             VALUES (:user_id, :trade_date, :market_type, :pair, :lot_size, :risk_type, :risk_value, :result, :pnl_amount, :risk_reward, :target_amount, :notes, :account_id, :session, :now, :now)'
        );
        $stmt->execute([
            ':user_id' => $userId,
            ':trade_date' => $data['trade_date'],
            ':market_type' => $data['market_type'],
            ':pair' => $data['pair'],
            ':lot_size' => $data['lot_size'],
            ':risk_type' => $data['risk_type'],
            ':risk_value' => $data['risk_value'],
            ':result' => $data['result'],
            ':pnl_amount' => $data['pnl_amount'],
            ':risk_reward' => $data['risk_reward'] ?? '',
            ':target_amount' => $data['target_amount'] ?? null,
            ':notes' => $data['notes'] ?? null,
            ':account_id' => $data['account_id'] ?? null,
            ':session' => $data['session'] ?? null,
            ':now' => $now,
        ]);
        return (int) $db->lastInsertId();
    }

    public static function update(int $id, array $data): bool
    {
        $now = date('Y-m-d H:i:s');
        $db = Database::getInstance();
        $stmt = $db->prepare(
            'UPDATE trades SET trade_date = :trade_date, market_type = :market_type, pair = :pair, lot_size = :lot_size,
             risk_type = :risk_type, risk_value = :risk_value, result = :result, pnl_amount = :pnl_amount,
             risk_reward = :risk_reward, target_amount = :target_amount, notes = :notes, account_id = :account_id,
             session = :session, updated_at = :now
             WHERE id = :id'
        );
        $stmt->execute([
            ':trade_date' => $data['trade_date'],
            ':market_type' => $data['market_type'],
            ':pair' => $data['pair'],
            ':lot_size' => $data['lot_size'],
            ':risk_type' => $data['risk_type'],
            ':risk_value' => $data['risk_value'],
            ':result' => $data['result'],
            ':pnl_amount' => $data['pnl_amount'],
            ':risk_reward' => $data['risk_reward'] ?? '',
            ':target_amount' => $data['target_amount'] ?? null,
            ':notes' => $data['notes'] ?? null,
            ':account_id' => $data['account_id'] ?? null,
            ':session' => $data['session'] ?? null,
            ':id' => $id,
            ':now' => $now,
        ]);
        return $stmt->rowCount() > 0;
    }

    public static function delete(int $id): bool
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('DELETE FROM trades WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public static function statsByMonth(int $userId, ?string $month = null, ?int $accountId = null): array
    {
        $db = Database::getInstance();
        $sql = 'SELECT COUNT(*) as total_trades,
                       COALESCE(SUM(pnl_amount), 0) as total_pnl,
                       COALESCE(SUM(CASE WHEN result = :win THEN 1 ELSE 0 END), 0) as wins,
                       COALESCE(SUM(CASE WHEN result = :loss THEN 1 ELSE 0 END), 0) as losses
                FROM trades
                WHERE user_id = :user_id';
        $params = [
            ':win' => 'win',
            ':loss' => 'loss',
            ':user_id' => $userId,
        ];

        if ($month !== null) {
            $sql .= ' AND trade_date LIKE :month_prefix';
            $params[':month_prefix'] = $month . '-%';
        }

        if ($accountId !== null) {
            $sql .= ' AND account_id = :account_id';
            $params[':account_id'] = $accountId;
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() ?: [];
    }

    public static function findByUserAndDateRange(int $userId, string $start, string $end, ?int $accountId = null): array
    {
        $db = Database::getInstance();
        $sql = 'SELECT * FROM trades WHERE user_id = :user_id AND trade_date BETWEEN :start AND :end';
        $params = [':user_id' => $userId, ':start' => $start, ':end' => $end];

        if ($accountId !== null) {
            $sql .= ' AND account_id = :account_id';
            $params[':account_id'] = $accountId;
        }

        $sql .= ' ORDER BY trade_date ASC, created_at ASC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function bestTradeByMonth(int $userId, ?string $month = null, ?int $accountId = null): ?array
    {
        $db = Database::getInstance();
        $sql = 'SELECT trade_date, pnl_amount as day_pnl
                FROM trades
                WHERE user_id = :user_id AND pnl_amount > 0';
        $params = [':user_id' => $userId];

        if ($month !== null) {
            $sql .= ' AND trade_date LIKE :month_prefix';
            $params[':month_prefix'] = $month . '-%';
        }

        if ($accountId !== null) {
            $sql .= ' AND account_id = :account_id';
            $params[':account_id'] = $accountId;
        }

        $sql .= ' ORDER BY pnl_amount DESC LIMIT 1';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function worstTradeByMonth(int $userId, ?string $month = null, ?int $accountId = null): ?array
    {
        $db = Database::getInstance();
        $sql = 'SELECT trade_date, pnl_amount as day_pnl
                FROM trades
                WHERE user_id = :user_id AND pnl_amount < 0';
        $params = [':user_id' => $userId];

        if ($month !== null) {
            $sql .= ' AND trade_date LIKE :month_prefix';
            $params[':month_prefix'] = $month . '-%';
        }

        if ($accountId !== null) {
            $sql .= ' AND account_id = :account_id';
            $params[':account_id'] = $accountId;
        }

        $sql .= ' ORDER BY pnl_amount ASC LIMIT 1';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}
