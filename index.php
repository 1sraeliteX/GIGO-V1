<?php

require_once __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/config');
$dotenv->safeLoad();

// The PHP dev server has no Apache rewrite, so serve uploaded email images from here.
if (PHP_SAPI === 'cli-server') {
    $uriPath = (string) (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '');
    if (strncmp($uriPath, '/uploads/', 9) === 0) {
        $file = realpath(__DIR__ . $uriPath);
        $root = realpath(__DIR__ . '/uploads');
        $types = ['png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'webp' => 'image/webp'];
        $ext = $file ? strtolower(pathinfo($file, PATHINFO_EXTENSION)) : '';
        if ($file && $root && strpos($file, $root . DIRECTORY_SEPARATOR) === 0 && is_file($file) && isset($types[$ext])) {
            header('Content-Type: ' . $types[$ext]);
            header('Content-Length: ' . filesize($file));
            header('X-Content-Type-Options: nosniff');
            readfile($file);
            exit;
        }
        http_response_code(404);
        exit;
    }
}

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
use App\Controllers\EmailController;
use App\Controllers\GrindReportController;
use App\Controllers\SupportController;

$router = new Router();

$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->post('/api/auth/logout', [AuthController::class, 'logout']);
$router->post('/api/auth/forgot-password', [AuthController::class, 'forgotPassword']);
$router->post('/api/auth/reset-password', [AuthController::class, 'resetPassword']);

$router->get('/api/trades/export', [TradeController::class, 'export']);
$router->get('/api/trades', [TradeController::class, 'index']);
$router->post('/api/trades', [TradeController::class, 'store']);
$router->put('/api/trades/{id}', [TradeController::class, 'update']);
$router->delete('/api/trades/{id}', [TradeController::class, 'destroy']);

$router->get('/api/stats', [StatsController::class, 'index']);
$router->get('/api/stats/activity', [StatsController::class, 'activity']);

$router->get('/api/grind-report', [GrindReportController::class, 'index']);
$router->get('/api/grind-report/settings', [GrindReportController::class, 'settings']);
$router->put('/api/grind-report/settings', [GrindReportController::class, 'updateSettings']);

$router->get('/api/settings', [SettingsController::class, 'show']);
$router->put('/api/settings', [SettingsController::class, 'update']);

// Public support widget config (used on every page, including login/register)
$router->get('/api/support/config', [SupportController::class, 'config']);

$router->get('/api/accounts', [AccountController::class, 'index']);
$router->post('/api/accounts', [AccountController::class, 'store']);
$router->put('/api/accounts/{id}', [AccountController::class, 'update']);
$router->delete('/api/accounts/{id}', [AccountController::class, 'destroy']);

$router->get('/api/subscribe/status', [SubscriptionController::class, 'status']);
$router->get('/api/subscribe/plans', [SubscriptionController::class, 'plans']);
$router->post('/api/subscribe/initialize', [SubscriptionController::class, 'initialize']);
$router->get('/api/subscribe/verify', [SubscriptionController::class, 'verify']);
$router->post('/api/paystack/webhook', [SubscriptionController::class, 'webhook']);

$router->get('/api/admin/payment-settings', [AdminController::class, 'getPaymentSettings']);
$router->put('/api/admin/payment-settings', [AdminController::class, 'updatePaymentSettings']);
$router->post('/api/admin/payment-settings/test', [AdminController::class, 'testPaymentSettings']);

$router->get('/api/admin/support-settings', [SupportController::class, 'adminShow']);
$router->put('/api/admin/support-settings', [SupportController::class, 'adminUpdate']);

// Admin routes — all protected by Middleware::authorizeAdmin()
$router->get('/api/admin/stats',                              [AdminController::class, 'stats']);
$router->get('/api/admin/users',                              [AdminController::class, 'listUsers']);
$router->put('/api/admin/users/{id}',                         [AdminController::class, 'updateUser']);
$router->delete('/api/admin/users/{id}',                      [AdminController::class, 'deleteUser']);
$router->get('/api/admin/users/{id}/subscriptions',           [AdminController::class, 'listUserSubscriptions']);
$router->post('/api/admin/users/{id}/subscriptions',          [AdminController::class, 'grantSubscription']);
$router->delete('/api/admin/subscriptions/{id}',              [AdminController::class, 'revokeSubscription']);
$router->get('/api/admin/plans',                              [AdminController::class, 'getPlans']);
$router->put('/api/admin/plans/{key}',                        [AdminController::class, 'updatePlan']);

// Admin email settings, templates, and sending
$router->get('/api/admin/email/settings',                     [EmailController::class, 'getSettings']);
$router->put('/api/admin/email/settings',                     [EmailController::class, 'updateSettings']);
$router->post('/api/admin/email/test',                        [EmailController::class, 'testConnection']);
$router->get('/api/admin/email/templates',                    [EmailController::class, 'listTemplates']);
$router->put('/api/admin/email/templates/{key}',              [EmailController::class, 'updateTemplate']);
$router->post('/api/admin/email/send',                        [EmailController::class, 'send']);
$router->post('/api/admin/email/send-to-user',                [EmailController::class, 'sendToUser']);
$router->get('/api/admin/email/media',                        [EmailController::class, 'listMedia']);
$router->post('/api/admin/email/media',                       [EmailController::class, 'uploadMedia']);
$router->delete('/api/admin/email/media/{name}',              [EmailController::class, 'deleteMedia']);

$router->dispatch(Request::method(), Request::uri());
