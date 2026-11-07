<?php

namespace App\Controllers;

use App\Core\Middleware;
use App\Core\Request;
use App\Models\Trade;

class StatsController
{
    public function index(): void
    {
        try {
            $user = Middleware::authenticate();
            $allTime = Request::query('all_time');
            $year = Request::query('year');
            $month = $year ?: (Request::query('month', date('Y-m')));
            $accountId = Request::query('account_id');

            if ($allTime) {
                $month = null;
            } elseif ($year) {
                if (!preg_match('/^\d{4}$/', $year)) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Invalid year format. Use YYYY']);
                    return;
                }
            } elseif (!preg_match('/^\d{4}-\d{2}$/', $month)) {
                http_response_code(422);
                echo json_encode(['error' => 'Invalid month format. Use YYYY-MM']);
                return;
            }

            $aid = $accountId !== null ? (int) $accountId : null;

            $stats = Trade::statsByMonth($user['sub'], $month, $aid);
            $totalTrades = (int) ($stats['total_trades'] ?? 0);
            $totalPnl = (float) ($stats['total_pnl'] ?? 0);
            $wins = (int) ($stats['wins'] ?? 0);
            $losses = (int) ($stats['losses'] ?? 0);

            $bestDay = Trade::bestTradeByMonth($user['sub'], $month, $aid);
            $worstDay = Trade::worstTradeByMonth($user['sub'], $month, $aid);

            echo json_encode([
                'total_trades' => $totalTrades,
                'total_pnl' => $totalPnl,
                'best_day' => $bestDay ? ['date' => $bestDay['trade_date'], 'pnl' => (float) $bestDay['day_pnl']] : null,
                'worst_day' => $worstDay ? ['date' => $worstDay['trade_date'], 'pnl' => (float) $worstDay['day_pnl']] : null,
                'win_rate' => $totalTrades > 0 ? round(($wins / $totalTrades) * 100, 1) : 0,
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch stats: ' . $e->getMessage()]);
        }
    }

    public function activity(): void
    {
        try {
            $user = Middleware::authenticate();
            $start = Request::query('start', date('Y-m-d', strtotime('-364 days')));
            $end = Request::query('end', date('Y-m-d'));

            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
                http_response_code(422);
                echo json_encode(['error' => 'Invalid date format. Use YYYY-MM-DD']);
                return;
            }

            if ($start > $end) {
                http_response_code(422);
                echo json_encode(['error' => 'start must be before or equal to end']);
                return;
            }

            $accountId = Request::query('account_id');
            $aid = $accountId !== null && $accountId !== '' ? (int) $accountId : null;

            $activity = Trade::activityByDateRange((int) $user['sub'], $start, $end, $aid);

            echo json_encode([
                'start' => $start,
                'end' => $end,
                'activity' => $activity,
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch activity: ' . $e->getMessage()]);
        }
    }
}
