<?php

/**
 * create-admin.php
 * ----------------
 * Promotes an existing user to admin by email.
 *
 * Usage:
 *   php create-admin.php your@email.com
 *
 * To revoke admin access:
 *   php create-admin.php your@email.com --revoke
 */

require_once __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/config');
$dotenv->safeLoad();

$email  = $argv[1] ?? null;
$revoke = in_array('--revoke', $argv, true);

if (!$email) {
    echo "Usage: php create-admin.php <email> [--revoke]\n";
    exit(1);
}

$config = require __DIR__ . '/config/config.php';
$db     = $config['db'];

try {
    if ($db['driver'] === 'sqlite') {
        $pdo = new PDO('sqlite:' . $db['sqlite_path'], null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } else {
        $dsn = "mysql:host={$db['host']};port={$db['port']};dbname={$db['name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    // Verify user exists
    $stmt = $pdo->prepare('SELECT id, name, email, is_admin FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user) {
        echo "No user found with email: {$email}\n";
        exit(1);
    }

    $newValue = $revoke ? 0 : 1;
    $action   = $revoke ? 'revoked admin from' : 'granted admin to';

    $pdo->prepare('UPDATE users SET is_admin = :val WHERE id = :id')
        ->execute([':val' => $newValue, ':id' => $user['id']]);

    echo "Success: {$action} {$user['name']} ({$user['email']}).\n";
    echo "They must log in again for the change to take effect.\n";
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
