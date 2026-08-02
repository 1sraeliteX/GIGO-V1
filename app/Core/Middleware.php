<?php

namespace App\Core;

use App\Helpers\JWT;

class Middleware
{
    public static function authenticate(): ?array
    {
        $token = Request::bearerToken();
        if (!$token) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }

        $config = require __DIR__ . '/../../config/config.php';
        $payload = JWT::decode($token, $config['jwt']['secret']);

        if (!$payload) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid or expired token']);
            exit;
        }

        return $payload;
    }

    /**
     * Authenticate the request AND assert the caller is an admin.
     * Returns the JWT payload on success; sends 401/403 and exits otherwise.
     */
    public static function authorizeAdmin(): array
    {
        $payload = self::authenticate();

        if (empty($payload['is_admin'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Admin access required']);
            exit;
        }

        return $payload;
    }
}
