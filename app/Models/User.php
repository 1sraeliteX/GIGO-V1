<?php

namespace App\Models;

use App\Core\Database;

class User
{
    public static function findByEmail(string $email): ?array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT id, name, email, password_hash, max_trades_per_day, is_admin, subscription_override, subscription_override_end, created_at FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public static function findById(int $id): ?array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT id, name, email, max_trades_per_day, is_admin, subscription_override, subscription_override_end, created_at FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public static function updateMaxTradesPerDay(int $id, ?int $value): void
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('UPDATE users SET max_trades_per_day = :value WHERE id = :id');
        $stmt->execute([':value' => $value, ':id' => $id]);
    }

    public static function create(array $data): int
    {
        $now = date('Y-m-d H:i:s');
        $db = Database::getInstance();
        // subscription_override=1 ensures new users never see the "Subscribe to Continue"
        // modal — access can be scoped later via the admin panel.
        $stmt = $db->prepare(
            'INSERT INTO users (name, email, password_hash, subscription_override, created_at)
             VALUES (:name, :email, :password_hash, 1, :now)'
        );
        $stmt->execute([
            ':name'          => $data['name'],
            ':email'         => $data['email'],
            ':password_hash' => password_hash($data['password'], PASSWORD_BCRYPT),
            ':now'           => $now,
        ]);
        return (int) $db->lastInsertId();
    }
}
