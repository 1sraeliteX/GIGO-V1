<?php

namespace App\Controllers;

use App\Core\Middleware;
use App\Core\Request;
use App\Models\GrindSettings;
use App\Models\Trade;
use App\Services\GrindReportService;

class GrindController
{
    // GET /api/grind/settings
    public function getSettings(): void
    {
        try {
            $user     = Middleware::authenticate();
            $settings = GrindSettings::findByUser($user['sub']);
            echo json_encode($settings);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch grind settings: ' . $e->getMessage()]);
        }
    }

    // PUT /api/grind/settings
    public function saveSettings(): void
    {
        try {
            $user = Middleware::authenticate();
            $data = Request::body();

            $errors = $this->validateSettings($data);
            if (!empty($errors)) {
                http_response_code(422);
                echo json_encode(['error' => 'Validation failed', 'fields' => $errors]);
                return;
            }

            GrindSettings::upsert($user['sub'], [
                'start_balance' => (float) $data['start_balance'],
                'win_amount'    => (float) $data['win_amount'],
                'loss_amount'   => (float) $data['loss_amount'],
                'pnl_mode'      => $data['pnl_mode'],
            ]);

            echo json_encode(['message' => 'Grind settings saved']);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save grind settings: ' . $e->getMessage()]);
        }
    }

    // GET /api/grind/report
    public function report(): void
    {
        try {
            $user      = Middleware::authenticate();
            $accountId = Request::query('account_id');
            $dateFrom  = Request::query('date_from');
            $dateTo    = Request::query('date_to');

            $settings  = GrindSettings::findByUser($user['sub']);

            $rawTrades = Trade::findAllByUser(
                $user['sub'],
                $accountId !== null ? (int) $accountId : null,
                $dateFrom ?: null,
                $dateTo   ?: null
            );

            $report = GrindReportService::build($settings, $rawTrades);

            // Serialise bcmath strings to floats for JSON
            echo json_encode($this->serialise($report));
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to build grind report: ' . $e->getMessage()]);
        }
    }

    // ----------------------------------------------------------------
    // Private helpers
    // ----------------------------------------------------------------

    private function validateSettings(array $data): array
    {
        $errors = [];

        $sb = $data['start_balance'] ?? null;
        if ($sb === null || (float)$sb <= 0) {
            $errors[] = 'start_balance must be positive';
        }

        $wa = $data['win_amount'] ?? null;
        if ($wa === null || (float)$wa < 0) {
            $errors[] = 'win_amount must be non-negative';
        }

        $la = $data['loss_amount'] ?? null;
        if ($la === null || (float)$la < 0) {
            $errors[] = 'loss_amount must be non-negative';
        }

        $mode = $data['pnl_mode'] ?? '';
        if (!in_array($mode, ['fixed', 'actual'], true)) {
            $errors[] = 'pnl_mode must be fixed or actual';
        }

        return $errors;
    }

    /**
     * Walk the report structure and convert bcmath strings to floats
     * so json_encode produces numbers instead of quoted strings.
     */
    private function serialise(mixed $v): mixed
    {
        if (is_array($v)) {
            return array_map([$this, 'serialise'], $v);
        }
        // If it looks like a numeric string from bcmath, cast to float
        if (is_string($v) && is_numeric($v)) {
            return (float) $v;
        }
        return $v;
    }
}
