<?php

namespace App\Services;

use App\Core\Database;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class EmailService
{
    private static ?array $settings = null;

    private const MEDIA_MAX_BYTES = 2 * 1024 * 1024;
    private const MEDIA_MIME_TYPES = [
        'image/png'  => 'png',
        'image/jpeg' => 'jpg',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
    ];

    public static function getSettings(): array
    {
        if (self::$settings !== null) return self::$settings;

        $db = Database::getInstance();
        $stmt = $db->query('SELECT * FROM email_settings WHERE id = 1 LIMIT 1');
        $row = $stmt->fetch();
        self::$settings = $row ?: [
            'smtp_host' => '', 'smtp_port' => 587, 'smtp_user' => '', 'smtp_pass' => '',
            'smtp_secure' => 'tls', 'from_email' => '', 'from_name' => 'Tradora',
            'reply_to' => null, 'is_enabled' => 0,
        ];
        return self::$settings;
    }

    public static function updateSettings(array $data): bool
    {
        $db = Database::getInstance();
        $stmt = $db->prepare(
            'UPDATE email_settings SET smtp_host = :host, smtp_port = :port, smtp_user = :user,
             smtp_pass = :pass, smtp_secure = :secure, from_email = :from_email, from_name = :from_name,
             reply_to = :reply_to, is_enabled = :enabled WHERE id = 1'
        );
        $result = $stmt->execute([
            ':host' => $data['smtp_host'] ?? '',
            ':port' => (int) ($data['smtp_port'] ?? 587),
            ':user' => $data['smtp_user'] ?? '',
            ':pass' => $data['smtp_pass'] ?? '',
            ':secure' => $data['smtp_secure'] ?? 'tls',
            ':from_email' => $data['from_email'] ?? '',
            ':from_name' => $data['from_name'] ?? 'Tradora',
            ':reply_to' => $data['reply_to'] ?? null,
            ':enabled' => !empty($data['is_enabled']) ? 1 : 0,
        ]);
        self::$settings = null; // reset cache
        return $result;
    }

    public static function getTemplate(string $key): ?array
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT template_key, subject, body FROM email_templates WHERE template_key = :key LIMIT 1');
        $stmt->execute([':key' => $key]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function getAllTemplates(): array
    {
        $db = Database::getInstance();
        return $db->query('SELECT id, template_key, subject, body, updated_at FROM email_templates ORDER BY template_key')->fetchAll();
    }

    public static function updateTemplate(string $key, array $data): bool
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('UPDATE email_templates SET subject = :subject, body = :body WHERE template_key = :key');
        return $stmt->execute([
            ':subject' => $data['subject'] ?? '',
            ':body' => self::sanitizeHtml($data['body'] ?? ''),
            ':key' => $key,
        ]);
    }

    public static function sanitizeHtml(string $html): string
    {
        $html = preg_replace('#<(script|style|iframe|object|embed|form|link|meta)\b[^>]*>.*?</\1>#is', '', $html);
        $html = preg_replace('#<(script|style|iframe|object|embed|form|link|meta)\b[^>]*/?>#i', '', $html);
        $html = preg_replace('#\son[a-z]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)#i', '', $html);
        $html = preg_replace('#\s(href|src)\s*=\s*(["\']?)\s*(?:javascript|vbscript)\s*:[^"\'>\s]*#i', ' $1=$2#', $html);
        $html = preg_replace('#\shref\s*=\s*(["\']?)\s*data:[^"\'>\s]*#i', ' href=$2#', $html);
        return $html;
    }

    public static function baseUrl(): string
    {
        $configured = trim((string) ($_ENV['APP_URL'] ?? ''));
        if ($configured !== '') return rtrim($configured, '/');

        // No APP_URL set (local dev): use the host the admin is actually on so
        // image URLs resolve through their dev server.
        $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
        if (!preg_match('/^[A-Za-z0-9._-]+(:\d{2,5})?$/', $host)) $host = 'localhost';
        $https = ($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off';
        return ($https ? 'https://' : 'http://') . $host;
    }

    /** @param array $file one entry from $_FILES */
    public static function saveMedia(array $file): array
    {
        if (($file['error'] ?? 4) !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('Upload failed. Try a smaller image.');
        }
        if ((int) $file['size'] > self::MEDIA_MAX_BYTES) {
            throw new \RuntimeException('Image is larger than 2MB.');
        }

        $mime = null;
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($finfo, $file['tmp_name']);
        }
        $info = @getimagesize($file['tmp_name']);
        if (!isset(self::MEDIA_MIME_TYPES[$mime]) || $info === false) {
            throw new \RuntimeException('Only PNG, JPEG, GIF and WEBP images are allowed.');
        }

        $dir = __DIR__ . '/../../uploads/email';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Could not create the uploads directory.');
        }

        $name = bin2hex(random_bytes(8)) . '.' . self::MEDIA_MIME_TYPES[$mime];
        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
            throw new \RuntimeException('Could not save the uploaded image.');
        }

        return self::mediaItem($name, (int) filesize($dir . '/' . $name));
    }

    public static function listMedia(): array
    {
        $dir = __DIR__ . '/../../uploads/email';
        if (!is_dir($dir)) return [];

        $files = [];
        foreach (glob($dir . '/*') ?: [] as $path) {
            if (!is_file($path)) continue;
            $name = basename($path);
            if (!preg_match('/^[a-f0-9]{16}\.(png|jpe?g|gif|webp)$/i', $name)) continue;
            $files[$name] = filemtime($path);
        }
        arsort($files);

        $items = [];
        foreach ($files as $name => $uploadedAt) {
            $item = self::mediaItem($name, (int) filesize($dir . '/' . $name));
            $item['uploaded_at'] = date('Y-m-d H:i', $uploadedAt);
            $items[] = $item;
        }
        return $items;
    }

    public static function deleteMedia(string $name): bool
    {
        if (!preg_match('/^[a-f0-9]{16}\.(png|jpe?g|gif|webp)$/i', $name)) return false;

        $dir = realpath(__DIR__ . '/../../uploads/email');
        $file = $dir ? $dir . '/' . $name : null;
        return $file && is_file($file) && unlink($file);
    }

    private static function mediaItem(string $name, int $size): array
    {
        return [
            'name' => $name,
            'url'  => self::baseUrl() . '/uploads/email/' . $name,
            'size' => $size,
        ];
    }

    public static function send(string $to, string $subject, string $htmlBody): bool
    {
        $settings = self::getSettings();
        if (!$settings['is_enabled'] || !$settings['smtp_host'] || !$settings['from_email']) {
            return false;
        }

        try {
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = $settings['smtp_host'];
            $mail->Port       = (int) $settings['smtp_port'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $settings['smtp_user'];
            $mail->Password   = $settings['smtp_pass'];
            $mail->SMTPSecure = $settings['smtp_secure'];

            $mail->setFrom($settings['from_email'], $settings['from_name']);
            if (!empty($settings['reply_to'])) {
                $mail->addReplyTo($settings['reply_to']);
            }
            $mail->addAddress($to);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $htmlBody;
            $mail->CharSet = 'UTF-8';

            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log("EmailService send failed: {$mail->ErrorInfo}");
            return false;
        }
    }

    public static function sendTemplate(string $to, string $templateKey, array $vars = []): bool
    {
        $template = self::getTemplate($templateKey);
        if (!$template) return false;

        $subject = $template['subject'];
        $body    = $template['body'];

        foreach ($vars as $k => $v) {
            $subject = str_replace("{{{$k}}}", $v, $subject);
            $body    = str_replace("{{{$k}}}", $v, $body);
        }

        return self::send($to, $subject, $body);
    }

    public static function testConnection(array $data): array
    {
        try {
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = $data['smtp_host'] ?? '';
            $mail->Port       = (int) ($data['smtp_port'] ?? 587);
            $mail->SMTPAuth   = true;
            $mail->Username   = $data['smtp_user'] ?? '';
            $mail->Password   = $data['smtp_pass'] ?? '';
            $mail->SMTPSecure = $data['smtp_secure'] ?? 'tls';
            $mail->Timeout    = 10;

            $mail->setFrom($data['from_email'] ?? 'test@test.com', 'Test');
            $mail->addAddress($data['from_email'] ?? 'test@test.com');
            $mail->Subject = 'Tradora SMTP Test';
            $mail->Body    = 'SMTP connection test successful.';
            $mail->send();

            return ['success' => true, 'message' => 'Test email sent successfully.'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}
