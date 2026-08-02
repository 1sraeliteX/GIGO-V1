<?php

namespace App\Models;

use App\Core\Database;

class Account
{
    public static function findByUserId(int $userId): array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT id, user_id, name, capital, max_trades_per_day, created_at FROM accounts WHERE user_id = :user_id ORDER BY created_at ASC');
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT id, user_id, name, capital, max_trades_per_day, created_at FROM accounts WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $account = $stmt->fetch();
        return $account ?: null;
    }

    public static function create(int $userId, array $data): int
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('INSERT INTO accounts (user_id, name, capital, max_trades_per_day) VALUES (:user_id, :name, :capital, :max_trades_per_day)');
        $stmt->execute([
            ':user_id' => $userId,
            ':name' => $data['name'],
            ':capital' => (float) ($data['capital'] ?? 0),
            ':max_trades_per_day' => isset($data['max_trades_per_day']) && $data['max_trades_per_day'] !== '' ? (int) $data['max_trades_per_day'] : null,
        ]);
        return (int) $db->lastInsertId();
    }

    public static function update(int $id, array $data): bool
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('UPDATE accounts SET name = :name, capital = :capital, max_trades_per_day = :max_trades_per_day WHERE id = :id');
        $stmt->execute([
            ':name' => $data['name'],
            ':capital' => (float) ($data['capital'] ?? 0),
            ':max_trades_per_day' => isset($data['max_trades_per_day']) && $data['max_trades_per_day'] !== '' ? (int) $data['max_trades_per_day'] : null,
            ':id' => $id,
        ]);
        return $stmt->rowCount() > 0;
    }

    public static function delete(int $id): bool
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('DELETE FROM accounts WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
