<?php

namespace App\Controllers;

use App\Core\Middleware;
use App\Core\Request;
use App\Services\EmailService;
use App\Models\User;

class EmailController
{
    public function getSettings(): void
    {
        try {
            Middleware::authorizeAdmin();
            $settings = EmailService::getSettings();
            // Never expose the password in API responses
            $settings['smtp_pass'] = $settings['smtp_pass'] ? '••••••••' : '';
            echo json_encode(['settings' => $settings]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch email settings: ' . $e->getMessage()]);
        }
    }

    public function updateSettings(): void
    {
        try {
            Middleware::authorizeAdmin();
            $data = Request::body();

            // If password is masked, keep existing
            if (($data['smtp_pass'] ?? '') === '••••••••') {
                $current = EmailService::getSettings();
                $data['smtp_pass'] = $current['smtp_pass'];
            }

            EmailService::updateSettings($data);
            echo json_encode(['message' => 'Email settings saved']);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save email settings: ' . $e->getMessage()]);
        }
    }

    public function testConnection(): void
    {
        try {
            Middleware::authorizeAdmin();
            $data = Request::body();

            // If password is masked, use stored one
            if (($data['smtp_pass'] ?? '') === '••••••••') {
                $current = EmailService::getSettings();
                $data['smtp_pass'] = $current['smtp_pass'];
            }

            $result = EmailService::testConnection($data);
            echo json_encode($result);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function listTemplates(): void
    {
        try {
            Middleware::authorizeAdmin();
            $templates = EmailService::getAllTemplates();
            echo json_encode(['templates' => $templates]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch templates: ' . $e->getMessage()]);
        }
    }

    public function updateTemplate(string $key): void
    {
        try {
            Middleware::authorizeAdmin();
            $data = Request::body();
            EmailService::updateTemplate($key, $data);
            $template = EmailService::getTemplate($key);
            echo json_encode(['message' => 'Template updated', 'template' => $template]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update template: ' . $e->getMessage()]);
        }
    }

    public function listMedia(): void
    {
        try {
            Middleware::authorizeAdmin();
            echo json_encode(['media' => EmailService::listMedia()]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to list images: ' . $e->getMessage()]);
        }
    }

    public function uploadMedia(): void
    {
        try {
            Middleware::authorizeAdmin();
            $file = $_FILES['file'] ?? null;
            if (!is_array($file)) {
                http_response_code(422);
                echo json_encode(['error' => 'No image received.']);
                return;
            }
            echo json_encode(['media' => EmailService::saveMedia($file)]);
        } catch (\RuntimeException $e) {
            http_response_code(422);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to upload image: ' . $e->getMessage()]);
        }
    }

    public function deleteMedia(string $name): void
    {
        try {
            Middleware::authorizeAdmin();
            if (EmailService::deleteMedia($name)) {
                echo json_encode(['message' => 'Image deleted']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Image not found']);
            }
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete image: ' . $e->getMessage()]);
        }
    }

    public function send(): void
    {
        try {
            Middleware::authorizeAdmin();
            $data = Request::body();

            $to = trim($data['to'] ?? '');
            $subject = trim($data['subject'] ?? '');
            $body = EmailService::sanitizeHtml($data['body'] ?? '');

            if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
                http_response_code(422);
                echo json_encode(['error' => 'Invalid recipient email']);
                return;
            }
            if (!$subject) {
                http_response_code(422);
                echo json_encode(['error' => 'Subject is required']);
                return;
            }

            $sent = EmailService::send($to, $subject, $body);
            if ($sent) {
                echo json_encode(['message' => "Email sent to {$to}"]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to send email. Check SMTP settings.']);
            }
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Send failed: ' . $e->getMessage()]);
        }
    }

    public function sendToUser(): void
    {
        try {
            Middleware::authorizeAdmin();
            $data = Request::body();

            $userId = (int) ($data['user_id'] ?? 0);
            $subject = trim($data['subject'] ?? '');
            $body = EmailService::sanitizeHtml($data['body'] ?? '');

            $user = User::findById($userId);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                return;
            }

            $sent = EmailService::send($user['email'], $subject, $body);
            if ($sent) {
                echo json_encode(['message' => "Email sent to {$user['email']}"]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to send email.']);
            }
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
