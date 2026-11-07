<?php

namespace App\Controllers;

use App\Core\Middleware;
use App\Core\Request;
use App\Models\SiteSetting;

class SupportController
{
    private const WHATSAPP_KEY = 'support_whatsapp_number';

    /**
     * GET /api/support/config
     * Public: the chat widget needs the support number on every page, including
     * login/register where no token exists.
     */
    public function config(): void
    {
        try {
            echo json_encode([
                'whatsapp_number' => SiteSetting::get(self::WHATSAPP_KEY, ''),
            ]);
        } catch (\Throwable $e) {
            // Never let a missing settings table break the public site.
            echo json_encode(['whatsapp_number' => '']);
        }
    }

    /**
     * GET /api/admin/support-settings
     */
    public function adminShow(): void
    {
        try {
            Middleware::authorizeAdmin();
            echo json_encode([
                'whatsapp_number' => SiteSetting::get(self::WHATSAPP_KEY, ''),
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch support settings: ' . $e->getMessage()]);
        }
    }

    /**
     * PUT /api/admin/support-settings
     * Accepts a display number (+234 801 234 5678) and stores E.164 digits.
     */
    public function adminUpdate(): void
    {
        try {
            Middleware::authorizeAdmin();
            $data = Request::body();
            $raw = trim((string) ($data['whatsapp_number'] ?? ''));

            $digits = preg_replace('/\D+/', '', $raw);
            if (str_starts_with($digits, '00')) {
                $digits = substr($digits, 2);
            }

            if ($digits === '' || strlen($digits) < 7 || strlen($digits) > 15) {
                http_response_code(422);
                echo json_encode(['error' => 'Enter a valid WhatsApp number including the country code (7–15 digits)']);
                return;
            }

            SiteSetting::save(self::WHATSAPP_KEY, $digits);

            echo json_encode([
                'message' => 'Support settings updated',
                'whatsapp_number' => $digits,
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update support settings: ' . $e->getMessage()]);
        }
    }
}
