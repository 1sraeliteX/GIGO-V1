<?php

return [
    'db' => [
        'driver' => $_ENV['DB_DRIVER'] ?? 'sqlite',
        'host' => $_ENV['DB_HOST'] ?? 'localhost',
        'port' => $_ENV['DB_PORT'] ?? '3306',
        'name' => $_ENV['DB_NAME'] ?? 'trade_journal',
        'user' => $_ENV['DB_USER'] ?? 'root',
        'pass' => $_ENV['DB_PASS'] ?? '',
        'sqlite_path' => __DIR__ . '/../database.sqlite',
    ],
    'jwt' => [
        'secret' => $_ENV['JWT_SECRET'] ?? 'change-this-to-a-random-secret-key',
        'issuer' => 'trade-journal',
        'expiry' => 86400 * 7,
    ],
    'app' => [
        'env' => $_ENV['APP_ENV'] ?? 'production',
        'default_currency' => $_ENV['DEFAULT_CURRENCY'] ?? 'USD',
        'url' => $_ENV['APP_URL'] ?? 'http://localhost:5173',
    ],
    'paystack' => [
        'public_key' => $_ENV['PAYSTACK_PUBLIC_KEY'] ?? '',
        'secret_key' => $_ENV['PAYSTACK_SECRET_KEY'] ?? '',
        'plans' => [
            'monthly' => ['label' => 'Monthly', 'days' => 30, 'amount' => 4],
            'quarterly' => ['label' => 'Quarterly', 'days' => 90, 'amount' => 10],
            'yearly' => ['label' => 'Yearly', 'days' => 365, 'amount' => 30],
        ],
    ],
];
