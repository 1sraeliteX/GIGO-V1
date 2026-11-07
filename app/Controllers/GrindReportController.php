<?php

namespace App\Controllers;

use App\Core\Middleware;
use App\Core\Request;
use App\Models\GrindSetting;
use App\Models\Trade;
use App\Services\GrindReportService;

class GrindReportController
{
    public function index(): void
    {
        try {
            $user = Middleware::authenticate();
            $userId = (int) $user['sub'];
            $filters = $this->filters();
            if (isset($filters['error'])) {
                http_response_code(422);
                echo json_encode(['error' => $filters['error']]);
                return;
            }

            $settings = GrindSetting::forUser($userId);
            $report = GrindReportService::cached($userId, $filters, $settings, function () use ($userId, $filters, $settings) {
                return GrindReportService::compute(Trade::findForGrindReport($userId, $filters), $settings);
            });
            $report['market_order'] = $settings['market_order'];
            echo json_encode($report);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to build grind report: ' . $e->getMessage()]);
        }
    }

    public function settings(): void
    {
        try {
            $user = Middleware::authenticate();
            echo json_encode(GrindSetting::forUser((int) $user['sub']));
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch grind settings: ' . $e->getMessage()]);
        }
    }

    public function updateSettings(): void
    {
        try {
            $user = Middleware::authenticate();
            $userId = (int) $user['sub'];
            $data = Request::body();
            $clean = [];

            foreach (['start_balance', 'win_amount', 'loss_amount'] as $field) {
                if (array_key_exists($field, $data)) {
                    if (!is_numeric($data[$field]) || (float) $data[$field] < 0) {
                        http_response_code(422);
                        echo json_encode(['error' => "{$field} must be a non-negative number"]);
                        return;
                    }
                    $clean[$field] = round((float) $data[$field], 2);
                }
            }
            if (array_key_exists('pnl_mode', $data)) {
                if (!in_array($data['pnl_mode'], ['fixed', 'actual'], true)) {
                    http_response_code(422);
                    echo json_encode(['error' => 'pnl_mode must be "fixed" or "actual"']);
                    return;
                }
                $clean['pnl_mode'] = $data['pnl_mode'];
            }
            if (array_key_exists('market_order', $data)) {
                if ($data['market_order'] !== null && (!is_array($data['market_order']) || count($data['market_order']) > 500
                    || array_filter($data['market_order'], fn($m) => !is_string($m) || strlen($m) > 50))) {
                    http_response_code(422);
                    echo json_encode(['error' => 'market_order must be an array of market names or null']);
                    return;
                }
                $clean['market_order'] = $data['market_order'];
            }

            $settings = GrindSetting::save($userId, $clean);
            GrindReportService::clearCache($userId);
            echo json_encode($settings);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update grind settings: ' . $e->getMessage()]);
        }
    }

    private function filters(): array
    {
        $filters = [];
        foreach (['from', 'to'] as $key) {
            $value = Request::query($key);
            if ($value !== null && $value !== '') {
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                    return ['error' => "Invalid {$key} date format. Use YYYY-MM-DD"];
                }
                $filters[$key] = $value;
            }
        }
        $pair = Request::query('pair');
        if ($pair !== null && $pair !== '') {
            $filters['pair'] = $pair;
        }
        $accountId = Request::query('account_id');
        if ($accountId !== null && $accountId !== '') {
            $filters['account_id'] = (int) $accountId;
        }
        return $filters;
    }
}