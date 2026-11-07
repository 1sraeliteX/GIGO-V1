<?php

namespace App\Services;

/**
 * Single source of truth for the Grind Report. All views and exports consume
 * the structure returned by compute(). Money is handled as integer cents.
 */
class GrindReportService
{
    public static function compute(array $trades, array $settings): array
    {
        $startCents = self::toCents($settings['start_balance']);
        $winCents = self::toCents($settings['win_amount']);
        $lossCents = self::toCents($settings['loss_amount']);
        $actual = ($settings['pnl_mode'] ?? 'fixed') === 'actual';

        // Map to W/L; breakeven (P/L = 0) trades are excluded.
        $mapped = [];
        foreach ($trades as $t) {
            $pnlCents = self::toCents($t['pnl_amount']);
            if ($pnlCents === 0) {
                continue;
            }
            $result = ($t['result'] ?? '') === 'win' ? 'W' : (($t['result'] ?? '') === 'loss' ? 'L' : ($pnlCents > 0 ? 'W' : 'L'));
            $mapped[] = [
                'id' => (int) $t['id'],
                'date' => $t['trade_date'],
                'created_at' => $t['created_at'] ?? '',
                'market' => $t['pair'],
                'result' => $result,
                'pnl_cents' => $actual ? $pnlCents : ($result === 'W' ? $winCents : -$lossCents),
            ];
        }

        usort($mapped, fn($a, $b) => [$a['date'], $a['created_at'], $a['id']] <=> [$b['date'], $b['created_at'], $b['id']]);

        // Group by market; markets ordered by first trade date, then name.
        $groups = [];
        foreach ($mapped as $t) {
            $groups[$t['market']][] = $t;
        }
        $names = array_keys($groups);
        usort($names, fn($a, $b) => [$groups[$a][0]['date'], $a] <=> [$groups[$b][0]['date'], $b]);

        $manual = $settings['market_order'] ?? null;
        if (is_array($manual) && $manual) {
            $rank = array_flip(array_map('strval', $manual));
            usort($names, fn($a, $b) => [$rank[$a] ?? PHP_INT_MAX, $groups[$a][0]['date'], $a] <=> [$rank[$b] ?? PHP_INT_MAX, $groups[$b][0]['date'], $b]);
        }

        // Walk markets row by row; balance carries across rows (one account).
        $markets = [];
        $log = [[
            'n' => 0, 'market' => null, 'row' => 0, 'col' => 0, 'result' => null,
            'pnl' => 0.0, 'balance' => self::dollars($startCents), 'date' => null,
        ]];
        $balance = $startCents;
        $n = 0;
        $peak = $startCents;
        $peakN = 0;
        $lowest = $startCents;
        $lowestN = 0;
        $maxDdCents = 0;
        $maxDdPct = 0.0;
        $ddPeakN = 0;
        $ddTroughN = 0;
        $runPeak = $startCents;
        $runPeakN = 0;

        $streak = null;
        $streakLen = 0;
        $bestWin = ['length' => 0, 'market' => null, 'from' => null, 'to' => null];
        $bestLoss = ['length' => 0, 'market' => null, 'from' => null, 'to' => null];
        $marketStreaks = [];

        foreach ($names as $rowIdx => $name) {
            $row = $rowIdx + 1;
            $cells = [];
            $balanceCells = [];
            $wins = 0;
            $losses = 0;
            $rowStart = $balance;
            $mStreak = null;
            $mStreakLen = 0;
            $mBestLoss = ['length' => 0, 'market' => $name, 'from' => null, 'to' => null];
            $mBestWin = ['length' => 0, 'market' => $name, 'from' => null, 'to' => null];

            foreach ($groups[$name] as $colIdx => $t) {
                $col = $colIdx + 1;
                $n++;
                $balance += $t['pnl_cents'];
                $wins += $t['result'] === 'W' ? 1 : 0;
                $losses += $t['result'] === 'L' ? 1 : 0;

                $cells[] = ['id' => $t['id'], 'result' => $t['result'], 'date' => $t['date'], 'col' => $col];
                $balanceCells[] = ['balance' => self::dollars($balance), 'result' => $t['result']];
                $log[] = [
                    'n' => $n, 'market' => $name, 'row' => $row, 'col' => $col,
                    'result' => $t['result'], 'pnl' => self::dollars($t['pnl_cents']),
                    'balance' => self::dollars($balance), 'date' => $t['date'],
                ];

                if ($balance > $peak) { $peak = $balance; $peakN = $n; }
                if ($balance < $lowest) { $lowest = $balance; $lowestN = $n; }
                if ($balance > $runPeak) { $runPeak = $balance; $runPeakN = $n; }
                $dd = $runPeak - $balance;
                if ($dd > $maxDdCents) {
                    $maxDdCents = $dd;
                    $maxDdPct = $runPeak > 0 ? round($dd / $runPeak * 100, 2) : 0.0;
                    $ddPeakN = $runPeakN;
                    $ddTroughN = $n;
                }

                // Overall streaks (grind order)
                if ($t['result'] === $streak) {
                    $streakLen++;
                } else {
                    $streak = $t['result'];
                    $streakLen = 1;
                }
                $candidate = ['length' => $streakLen, 'market' => $name, 'from' => $n - $streakLen + 1, 'to' => $n];
                if ($t['result'] === 'W' && $streakLen > $bestWin['length']) $bestWin = $candidate;
                if ($t['result'] === 'L' && $streakLen > $bestLoss['length']) $bestLoss = $candidate;

                // Per-market streaks
                if ($t['result'] === $mStreak) {
                    $mStreakLen++;
                } else {
                    $mStreak = $t['result'];
                    $mStreakLen = 1;
                }
                $mCandidate = ['length' => $mStreakLen, 'market' => $name, 'from' => $n - $mStreakLen + 1, 'to' => $n];
                if ($t['result'] === 'W' && $mStreakLen > $mBestWin['length']) $mBestWin = $mCandidate;
                if ($t['result'] === 'L' && $mStreakLen > $mBestLoss['length']) $mBestLoss = $mCandidate;
            }

            $total = $wins + $losses;
            $markets[] = [
                'name' => $name,
                'row' => $row,
                'trades' => $cells,
                'balances' => $balanceCells,
                'wins' => $wins,
                'losses' => $losses,
                'win_pct' => $total > 0 ? round($wins / $total * 100, 1) : 0.0,
                'end_balance' => self::dollars($balance),
                'net_pnl' => self::dollars($balance - $rowStart),
            ];
            if ($mBestLoss['length'] > 0) $marketStreaks[] = $mBestLoss;
        }

        $totalTrades = $n;
        $totalWins = array_sum(array_column($markets, 'wins'));
        $totalLosses = $totalTrades - $totalWins;
        $net = $balance - $startCents;

        return [
            'settings' => [
                'start_balance' => self::dollars($startCents),
                'win_amount' => self::dollars($winCents),
                'loss_amount' => self::dollars($lossCents),
                'pnl_mode' => $actual ? 'actual' : 'fixed',
            ],
            'markets' => $markets,
            'log' => $log,
            'stats' => [
                'total_trades' => $totalTrades,
                'wins' => $totalWins,
                'losses' => $totalLosses,
                'win_rate' => $totalTrades > 0 ? round($totalWins / $totalTrades * 100, 1) : 0.0,
                'final_balance' => self::dollars($balance),
                'net_profit' => self::dollars($net),
                'total_return_pct' => $startCents > 0 ? round($net / $startCents * 100, 2) : 0.0,
                'peak_balance' => self::dollars($peak),
                'peak_trade' => $peakN,
                'lowest_balance' => self::dollars($lowest),
                'lowest_trade' => $lowestN,
                'max_drawdown' => self::dollars($maxDdCents),
                'max_drawdown_pct' => $maxDdPct,
                'drawdown_peak_trade' => $ddPeakN,
                'drawdown_trough_trade' => $ddTroughN,
                'longest_win_streak' => $bestWin,
                'longest_loss_streak' => $bestLoss,
                'longest_loss_streak_per_market' => $marketStreaks,
            ],
        ];
    }

    public static function toCents($value): int
    {
        return (int) round(((float) $value) * 100);
    }

    public static function dollars(int $cents): float
    {
        return round($cents / 100, 2);
    }

    // --- File cache, per user; cleared on any trade or settings change ---

    private static function cacheDir(): string
    {
        return __DIR__ . '/../../cache/grind';
    }

    public static function cached(int $userId, array $filters, array $settings, callable $compute): array
    {
        $dir = self::cacheDir();
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $key = $dir . '/' . $userId . '-' . md5(json_encode([$filters, $settings])) . '.json';
        if (is_file($key)) {
            $data = json_decode((string) file_get_contents($key), true);
            if (is_array($data)) {
                return $data;
            }
        }
        $data = $compute();
        file_put_contents($key, json_encode($data), LOCK_EX);
        return $data;
    }

    public static function clearCache(int $userId): void
    {
        foreach (glob(self::cacheDir() . '/' . $userId . '-*.json') ?: [] as $file) {
            unlink($file);
        }
    }
}