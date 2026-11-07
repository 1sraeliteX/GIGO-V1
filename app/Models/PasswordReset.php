<?php

namespace App\Models;

use App\Core\Database;

class PasswordReset
{
    public static function create(int $userId, string $email, string $tokenHash, string $expiresAt): void
    {
        $db = Database::getInstance();
        $db->prepare('DELETE FROM password_resets WHERE email = :email')->execute([':email' => $email]);

        $stmt = $db->prepare(
            'INSERT INTO password_resets (user_id, email, token_hash, expires_at, created_at)
             VALUES (:user_id, :email, :token_hash, :expires_at, :created_at)'
        );
        $stmt->execute([
            ':user_id'    => $userId,
            ':email'      => $email,
            ':token_hash' => $tokenHash,
            ':expires_at' => $expiresAt,
            ':created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public static function findValid(string $email, string $tokenHash): ?array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare(
            'SELECT id, user_id FROM password_resets
             WHERE email = :email AND token_hash = :token_hash AND expires_at > :now
             LIMIT 1'
        );
        $stmt->execute([
            ':email'      => $email,
            ':token_hash' => $tokenHash,
            ':now'        => date('Y-m-d H:i:s'),
        ]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function deleteForEmail(string $email): void
    {
        $db = Database::getInstance();
        $db->prepare('DELETE FROM password_resets WHERE email = :email')->execute([':email' => $email]);
    }
}
