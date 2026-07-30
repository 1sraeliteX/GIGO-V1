<?php

namespace App\Controllers;

use App\Core\Request;
use App\Helpers\JWT;
use App\Models\User;

class AuthController
{
    public function register(): void
    {
        try {
            $data = Request::body();

            if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
                http_response_code(422);
                echo json_encode(['error' => 'Name, email, and password are required']);
                return;
            }

            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                http_response_code(422);
                echo json_encode(['error' => 'Invalid email format']);
                return;
            }

            if (strlen($data['password']) < 6) {
                http_response_code(422);
                echo json_encode(['error' => 'Password must be at least 6 characters']);
                return;
            }

            if (User::findByEmail($data['email'])) {
                http_response_code(409);
                echo json_encode(['error' => 'Email already registered']);
                return;
            }

            $userId = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);

            $config = require __DIR__ . '/../../config/config.php';
            $token = JWT::encode([
                'sub' => $userId,
                'email' => $data['email'],
                'name' => $data['name'],
                'exp' => time() + $config['jwt']['expiry'],
                'iss' => $config['jwt']['issuer'],
            ], $config['jwt']['secret']);

            http_response_code(201);
            echo json_encode([
                'message' => 'Registration successful',
                'token' => $token,
                'user' => ['id' => $userId, 'name' => $data['name'], 'email' => $data['email'], 'max_trades_per_day' => null],
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Registration failed: ' . $e->getMessage()]);
        }
    }

    public function login(): void
    {
        try {
            $data = Request::body();

            if (empty($data['email']) || empty($data['password'])) {
                http_response_code(422);
                echo json_encode(['error' => 'Email and password are required']);
                return;
            }

            $user = User::findByEmail($data['email']);

            if (!$user || !password_verify($data['password'], $user['password_hash'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid credentials']);
                return;
            }

            $config = require __DIR__ . '/../../config/config.php';
            $token = JWT::encode([
                'sub' => $user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'exp' => time() + $config['jwt']['expiry'],
                'iss' => $config['jwt']['issuer'],
            ], $config['jwt']['secret']);

            echo json_encode([
                'message' => 'Login successful',
                'token' => $token,
                'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'max_trades_per_day' => $user['max_trades_per_day'] ?? null],
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Login failed: ' . $e->getMessage()]);
        }
    }

    public function logout(): void
    {
        try {
            echo json_encode(['message' => 'Logged out successfully']);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Logout failed: ' . $e->getMessage()]);
        }
    }
}
