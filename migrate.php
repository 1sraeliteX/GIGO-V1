<?php

require_once __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/config');
$dotenv->safeLoad();

require_once __DIR__ . '/app/Migrations/001_create_users_table.php';
require_once __DIR__ . '/app/Migrations/002_create_trades_table.php';
require_once __DIR__ . '/app/Migrations/003_add_max_trades_to_users.php';
require_once __DIR__ . '/app/Migrations/004_add_accounts_table.php';
require_once __DIR__ . '/app/Migrations/005_add_target_amount_to_trades.php';
require_once __DIR__ . '/app/Migrations/006_add_max_trades_per_day_to_accounts.php';
require_once __DIR__ . '/app/Migrations/007_add_trade_indexes.php';
require_once __DIR__ . '/app/Migrations/008_create_subscriptions_table.php';
require_once __DIR__ . '/app/Migrations/009_add_session_to_trades.php';
require_once __DIR__ . '/app/Migrations/010_add_admin_and_override_to_users.php';
require_once __DIR__ . '/app/Migrations/011_add_subscription_override_end_to_users.php';

$action = $argv[1] ?? 'up';

if ($action === 'up') {
    $steps = [
        'App\Migrations\CreateUsersTable::up',
        'App\Migrations\CreateTradesTable::up',
        'App\Migrations\AddMaxTradesToUsers::up',
        'App\Migrations\AddAccountsTable::up',
        'App\Migrations\AddTargetAmountToTrades::up',
        'App\Migrations\AddMaxTradesPerDayToAccounts::up',
        'App\Migrations\AddTradeIndexes::up',
        'App\Migrations\CreateSubscriptionsTable::up',
        'App\Migrations\AddSessionToTrades::up',
        'App\Migrations\AddAdminAndOverrideToUsers::up',
        'App\Migrations\AddSubscriptionOverrideEndToUsers::up',
    ];
    foreach ($steps as $step) {
        try {
            $step();
        } catch (\Throwable $e) {
            echo "Skipped: {$step} ({$e->getMessage()})\n";
        }
    }
    echo "Migrations complete.\n";
} elseif ($action === 'down') {
    \App\Migrations\CreateSubscriptionsTable::down();
    \App\Migrations\AddTradeIndexes::down();
    \App\Migrations\AddMaxTradesPerDayToAccounts::down();
    \App\Migrations\AddTargetAmountToTrades::down();
    \App\Migrations\AddAccountsTable::down();
    \App\Migrations\AddMaxTradesToUsers::down();
    \App\Migrations\CreateTradesTable::down();
    \App\Migrations\CreateUsersTable::down();
    echo "Rollback complete.\n";
} elseif ($action === 'fresh') {
    \App\Migrations\CreateTradesTable::down();
    \App\Migrations\CreateUsersTable::down();
    \App\Migrations\CreateUsersTable::up();
    \App\Migrations\CreateTradesTable::up();
    \App\Migrations\AddMaxTradesToUsers::up();
    \App\Migrations\AddAccountsTable::up();
    \App\Migrations\AddTargetAmountToTrades::up();
    \App\Migrations\AddMaxTradesPerDayToAccounts::up();
    echo "Fresh migration complete.\n";
} else {
    echo "Usage: php migrate.php [up|down|fresh]\n";
}
