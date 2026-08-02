<?php

require_once __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/config');
$dotenv->safeLoad();

$config = require __DIR__ . '/config/config.php';
$isDev = ($config['app']['env'] ?? 'production') === 'development';

error_reporting($isDev ? E_ALL : 0);
ini_set('display_errors', $isDev ? '1' : '0');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
    exit;
}

set_exception_handler(function (\Throwable $e) use ($isDev) {
    if (headers_sent() === false) {
        header('Content-Type: application/json');
    }
    http_response_code(500);
    $body = ['error' => 'Internal server error'];
    if ($isDev) {
        $body['error'] = $e->getMessage();
        $body['file'] = $e->getFile() . ':' . $e->getLine();
    }
    echo json_encode($body);
    exit;
});

register_shutdown_function(function () use ($isDev) {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (headers_sent() === false) {
            header('Content-Type: application/json');
            http_response_code(500);
        }
        $body = ['error' => 'Internal server error'];
        if ($isDev) {
            $body['error'] = $err['message'];
            $body['file'] = $err['file'] . ':' . $err['line'];
        }
        echo json_encode($body);
    }
});

use App\Core\Router;
use App\Core\Request;
use App\Controllers\AuthController;
use App\Controllers\TradeController;
use App\Controllers\StatsController;
use App\Controllers\SettingsController;
use App\Controllers\AccountController;
use App\Controllers\SubscriptionController;
use App\Controllers\AdminController;

$router = new Router();

$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->post('/api/auth/logout', [AuthController::class, 'logout']);

$router->get('/api/trades/export', [TradeController::class, 'export']);
$router->get('/api/trades', [TradeController::class, 'index']);
$router->post('/api/trades', [TradeController::class, 'store']);
$router->put('/api/trades/{id}', [TradeController::class, 'update']);
$router->delete('/api/trades/{id}', [TradeController::class, 'destroy']);

$router->get('/api/stats', [StatsController::class, 'index']);

$router->get('/api/settings', [SettingsController::class, 'show']);
$router->put('/api/settings', [SettingsController::class, 'update']);

$router->get('/api/accounts', [AccountController::class, 'index']);
$router->post('/api/accounts', [AccountController::class, 'store']);
$router->put('/api/accounts/{id}', [AccountController::class, 'update']);
$router->delete('/api/accounts/{id}', [AccountController::class, 'destroy']);

$router->get('/api/subscribe/status', [SubscriptionController::class, 'status']);
$router->get('/api/subscribe/plans', [SubscriptionController::class, 'plans']);
$router->post('/api/subscribe/initialize', [SubscriptionController::class, 'initialize']);
$router->get('/api/subscribe/verify', [SubscriptionController::class, 'verify']);

// Admin routes — all protected by Middleware::authorizeAdmin()
$router->get('/api/admin/stats',                              [AdminController::class, 'stats']);
$router->get('/api/admin/users',                              [AdminController::class, 'listUsers']);
$router->put('/api/admin/users/{id}',                         [AdminController::class, 'updateUser']);
$router->delete('/api/admin/users/{id}',                      [AdminController::class, 'deleteUser']);
$router->get('/api/admin/users/{id}/subscriptions',           [AdminController::class, 'listUserSubscriptions']);
$router->post('/api/admin/users/{id}/subscriptions',          [AdminController::class, 'grantSubscription']);
$router->delete('/api/admin/subscriptions/{id}',              [AdminController::class, 'revokeSubscription']);

$router->dispatch(Request::method(), Request::uri());
