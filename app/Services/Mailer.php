<?php

namespace App\Services;

class Mailer
{
    public static function sendPasswordReset(string $email, string $name, string $link): bool
    {
        // Try EmailService (SMTP) first
        $sent = EmailService::sendTemplate($email, 'forgot_password', [
            'name' => $name,
            'reset_link' => $link,
        ]);

        if ($sent) return true;

        // Fallback to PHP mail() if SMTP not configured
        $from = $_ENV['MAIL_FROM'] ?? '';
        if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
            $appUrl = $_ENV['APP_URL'] ?? 'http://localhost:5173';
            $host = parse_url($appUrl, PHP_URL_HOST) ?: 'localhost';
            $from = 'no-reply@' . $host;
        }

        $subject = 'Reset your Tradora password';
        $body = "Hi {$name},\n\n"
            . "We received a request to reset your Tradora password.\n"
            . "Use the link below to choose a new one. It expires in 1 hour and can be used once.\n\n"
            . "{$link}\n\n"
            . "If you didn't request this, you can safely ignore this email.\n";

        $headers = implode("\r\n", [
            'From: ' . $from,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
        ]);

        return @mail($email, $subject, $body, $headers);
    }
}
