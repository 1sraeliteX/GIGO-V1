<?php

namespace App\Controllers;

use App\Core\Request;
use App\Helpers\JWT;
use App\Models\PasswordReset;
use App\Models\User;
use App\Services\Mailer;
use App\Services\Turnstile;

class AuthController
{
    public function register(): void
    {
        try {
            $data = Request::body();

            if (!Turnstile::verify($data['cf-turnstile-response'] ?? null, 'signup')) {
                http_response_code(403);
                echo json_encode(['error' => 'Verification failed. Please retry.']);
                return;
            }

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
                'sub'      => $userId,
                'email'    => $data['email'],
                'name'     => $data['name'],
                'is_admin' => false,
                'exp'      => time() + $config['jwt']['expiry'],
                'iss'      => $config['jwt']['issuer'],
            ], $config['jwt']['secret']);

            http_response_code(201);
            echo json_encode([
                'message' => 'Registration successful',
                'token'   => $token,
                'user'    => [
                    'id'                    => $userId,
                    'name'                  => $data['name'],
                    'email'                 => $data['email'],
                    'max_trades_per_day'    => null,
                    'is_admin'              => false,
                    'subscription_override' => true,
                ],
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

            if (!Turnstile::verify($data['cf-turnstile-response'] ?? null, 'login')) {
                http_response_code(403);
                echo json_encode(['error' => 'Verification failed. Please retry.']);
                return;
            }

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
                'sub'      => $user['id'],
                'email'    => $user['email'],
                'name'     => $user['name'],
                'is_admin' => (bool) ($user['is_admin'] ?? false),
                'exp'      => time() + $config['jwt']['expiry'],
                'iss'      => $config['jwt']['issuer'],
            ], $config['jwt']['secret']);

            echo json_encode([
                'message' => 'Login successful',
                'token'   => $token,
                'user'    => [
                    'id'                    => $user['id'],
                    'name'                  => $user['name'],
                    'email'                 => $user['email'],
                    'max_trades_per_day'    => $user['max_trades_per_day'] ?? null,
                    'is_admin'              => (bool) ($user['is_admin'] ?? false),
                    'subscription_override' => (bool) ($user['subscription_override'] ?? false),
                ],
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

    public function forgotPassword(): void
    {
        try {
            $data = Request::body();

            if (!Turnstile::verify($data['cf-turnstile-response'] ?? null, 'forgot_password')) {
                http_response_code(403);
                echo json_encode(['error' => 'Verification failed. Please retry.']);
                return;
            }

            $email = is_string($data['email'] ?? null) ? trim($data['email']) : '';
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(422);
                echo json_encode(['error' => 'Enter a valid email address']);
                return;
            }

            $user = User::findByEmail($email);
            if ($user) {
                $token = bin2hex(random_bytes(32));
                PasswordReset::create(
                    (int) $user['id'],
                    $user['email'],
                    hash('sha256', $token),
                    date('Y-m-d H:i:s', time() + 3600)
                );

                $config = require __DIR__ . '/../../config/config.php';
                $link = rtrim($config['app']['url'], '/')
                    . '/reset-password?token=' . $token
                    . '&email=' . urlencode($user['email']);

                Mailer::sendPasswordReset($user['email'], $user['name'], $link);
            }

            // Same response whether or not the account exists.
            echo json_encode(['message' => 'If an account exists for that email, a reset link has been sent.']);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Unable to process password reset: ' . $e->getMessage()]);
        }
    }

    public function resetPassword(): void
    {
        try {
            $data = Request::body();

            $email = is_string($data['email'] ?? null) ? trim($data['email']) : '';
            $token = is_string($data['token'] ?? null) ? $data['token'] : '';
            $password = is_string($data['password'] ?? null) ? $data['password'] : '';

            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
                http_response_code(422);
                echo json_encode(['error' => 'This reset link is invalid or has expired.']);
                return;
            }

            if (strlen($password) < 6) {
                http_response_code(422);
                echo json_encode(['error' => 'Password must be at least 6 characters']);
                return;
            }

            $reset = PasswordReset::findValid($email, hash('sha256', $token));
            if (!$reset) {
                http_response_code(400);
                echo json_encode(['error' => 'This reset link is invalid or has expired.']);
                return;
            }

            User::updatePassword((int) $reset['user_id'], $password);
            PasswordReset::deleteForEmail($email);

            echo json_encode(['message' => 'Password updated. You can now sign in.']);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Unable to reset password: ' . $e->getMessage()]);
        }
    }
}
