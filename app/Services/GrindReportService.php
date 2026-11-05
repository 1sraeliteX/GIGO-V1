<?php

namespace App\Services;

/**
 * GrindReportService
 *
 * Single source of truth for all four Grind Report views.
 * All arithmetic uses bcmath (string-based decimal) to avoid float rounding.
 *
 * Returns:
 * [
 *   settings  => [...],
 *   markets   => [{ name, sort_order, trades:[{id,result,pnl,raw_result},...] },...],
 *   log       => [{trade_num, market, col, result, pnl, balance},...],  // log-order
 *   log_chrono=> same trades sorted chronologically
 *   grid      => same shape as markets but cells have {result,balance}
 *   stats     => { win_rate, total, wins, losses, peak, lowest, max_drawdown_abs,
 *                  max_drawdown_pct, longest_win_streak, longest_loss_streak,
 *                  longest_loss_per_market:[{market,start,end,length},...],
 *                  longest_win_per_market:[...], final_balance }
 * ]
 *
 * Breakeven (pnl = 0): result = 'B', no balance change, shown in all tables.
 */
class GrindReportService
{
    private const SCALE = 4; // bcmath scale

    public static function build(array $settings, array $rawTrades): array
    {
        // ----------------------------------------------------------------
        // 1. Normalise settings to strings for bcmath
        // ----------------------------------------------------------------
        $startBal  = self::str($settings['start_balance']);
        $winAmt    = self::str($settings['win_amount']);
        $lossAmt   = self::str($settings['loss_amount']);
        $pnlMode   = $settings['pnl_mode'] ?? 'fixed';

        // ----------------------------------------------------------------
        // 2. Group trades into markets (ordered by first trade date, then id)
        // ----------------------------------------------------------------
        $marketMap   = [];   // name => [trades in order]
        $marketFirst = [];   // name => [date, id] for sorting

        foreach ($rawTrades as $t) {
            $pair   = trim($t['pair'] ?? '');
            if ($pair === '') continue;

            $result = self::mapResult($t, $pnlMode, $winAmt, $lossAmt);

            $marketMap[$pair][] = [
                'id'         => (int)$t['id'],
                'trade_date' => $t['trade_date'],
                'created_at' => $t['created_at'] ?? $t['trade_date'],
                'result'     => $result['label'],   // W / L / B
                'pnl'        => $result['pnl'],     // bcmath string
                'raw_result' => $t['result'],
                'raw_pnl'    => self::str($t['pnl_amount'] ?? 0),
            ];

            if (!isset($marketFirst[$pair])) {
                $marketFirst[$pair] = [$t['trade_date'], (int)$t['id']];
            }
        }

        // Sort markets by first trade date/id
        uksort($marketMap, function ($a, $b) use ($marketFirst) {
            [$da, $ia] = $marketFirst[$a];
            [$db, $ib] = $marketFirst[$b];
            if ($da !== $db) return strcmp($da, $db);
            return $ia <=> $ib;
        });

        $markets = [];
        foreach ($marketMap as $name => $trades) {
            $markets[] = ['name' => $name, 'trades' => $trades];
        }

        // ----------------------------------------------------------------
        // 3. Build the flat log (grind-table order: market by market)
        // ----------------------------------------------------------------
        $balance = $startBal;
        $log     = [];
        $tradeNum = 0;

        // log entry 0 = start balance
        $log[] = [
            'trade_num' => 0,
            'market'    => '',
            'col'       => 0,
            'result'    => '',
            'pnl'       => '0',
            'balance'   => $balance,
        ];

        $gridData = [];   // parallel to $markets; each element = array of {result,balance}

        foreach ($markets as $mIdx => $market) {
            $gridData[$mIdx] = [];
            foreach ($market['trades'] as $col => $trade) {
                $tradeNum++;
                $balance = bcadd($balance, $trade['pnl'], self::SCALE);
                $log[] = [
                    'trade_num'  => $tradeNum,
                    'market'     => $market['name'],
                    'col'        => $col + 1,
                    'result'     => $trade['result'],
                    'pnl'        => $trade['pnl'],
                    'balance'    => $balance,
                    'trade_date' => $trade['trade_date'],
                    'trade_id'   => $trade['id'],
                ];
                $gridData[$mIdx][] = [
                    'result'  => $trade['result'],
                    'balance' => $balance,
                ];
            }
        }

        // ----------------------------------------------------------------
        // 4. Build grid rows (markets with end_balance & row_pnl)
        // ----------------------------------------------------------------
        $grid = [];
        foreach ($markets as $mIdx => $market) {
            $cells    = $gridData[$mIdx];
            $endBal   = count($cells) > 0 ? end($cells)['balance'] : ($mIdx === 0 ? $startBal : end($grid)['end_balance']);
            $startRow = $mIdx === 0
                ? $startBal
                : (count($grid) > 0 ? end($grid)['end_balance'] : $startBal);
            $rowPnl   = bcsub($endBal, $startRow, self::SCALE);

            $grid[] = [
                'name'        => $market['name'],
                'cells'       => $cells,
                'end_balance' => $endBal,
                'row_pnl'     => $rowPnl,
            ];
        }

        // ----------------------------------------------------------------
        // 5. Chronological log (sort non-zero entries by date then id)
        // ----------------------------------------------------------------
        $chronoLog = [];
        $chronoBalance = $startBal;
        // We need to re-sort the flat trades by date/id and recalculate running balance
        $allTrades = [];
        foreach ($log as $entry) {
            if ($entry['trade_num'] === 0) continue;
            $allTrades[] = $entry;
        }
        usort($allTrades, fn($a, $b) => strcmp($a['trade_date'], $b['trade_date']) ?: ($a['trade_id'] <=> $b['trade_id']));

        $chronoBalance = $startBal;
        $chronoLog = [[
            'trade_num' => 0,
            'market'    => '',
            'col'       => 0,
            'result'    => '',
            'pnl'       => '0',
            'balance'   => $startBal,
        ]];
        $cn = 0;
        foreach ($allTrades as $entry) {
            $cn++;
            $chronoBalance = bcadd($chronoBalance, $entry['pnl'], self::SCALE);
            $chronoLog[] = array_merge($entry, ['trade_num' => $cn, 'balance' => $chronoBalance]);
        }

        // ----------------------------------------------------------------
        // 6. Stats
        // ----------------------------------------------------------------
        $stats = self::computeStats($log, $startBal, $markets);

        // ----------------------------------------------------------------
        // 7. Summary for markets (wins, losses, win% per row)
        // ----------------------------------------------------------------
        foreach ($markets as &$market) {
            $w = $l = $b = 0;
            foreach ($market['trades'] as $t) {
                if ($t['result'] === 'W') $w++;
                elseif ($t['result'] === 'L') $l++;
                else $b++;
            }
            $total         = $w + $l + $b;
            $market['wins']   = $w;
            $market['losses'] = $l;
            $market['breakeven'] = $b;
            $market['total']  = $total;
            $market['win_pct'] = ($w + $l) > 0 ? round($w / ($w + $l) * 100, 1) : null;
        }
        unset($market);

        return [
            'settings'  => $settings,
            'markets'   => $markets,
            'log'       => $log,
            'log_chrono'=> $chronoLog,
            'grid'      => $grid,
            'stats'     => $stats,
        ];
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    private static function mapResult(array $t, string $pnlMode, string $winAmt, string $lossAmt): array
    {
        $rawResult = strtolower(trim($t['result'] ?? ''));
        $rawPnl    = self::str($t['pnl_amount'] ?? 0);

        // Determine W / L / B label
        if ($rawResult === 'win') {
            $label = 'W';
        } elseif ($rawResult === 'loss') {
            $label = 'L';
        } else {
            // Fall back to PNL sign
            $cmp = bccomp($rawPnl, '0', self::SCALE);
            if ($cmp > 0) $label = 'W';
            elseif ($cmp < 0) $label = 'L';
            else $label = 'B';
        }

        // Also treat explicit pnl=0 as breakeven regardless of stored result
        if (bccomp($rawPnl, '0', self::SCALE) === 0 && $rawResult !== 'win' && $rawResult !== 'loss') {
            $label = 'B';
        }
        // If stored result = win/loss but pnl = 0, treat as B
        if (bccomp($rawPnl, '0', self::SCALE) === 0) {
            $label = 'B';
        }

        // Determine effective PNL
        if ($label === 'B') {
            $pnl = '0';
        } elseif ($pnlMode === 'actual') {
            $pnl = $rawPnl;
        } else {
            // fixed
            $pnl = $label === 'W' ? $winAmt : bcsub('0', $lossAmt, self::SCALE);
        }

        return ['label' => $label, 'pnl' => $pnl];
    }

    private static function computeStats(array $log, string $startBal, array $markets): array
    {
        // Exclude entry 0 (start)
        $entries = array_slice($log, 1);

        $wins   = 0;
        $losses = 0;
        $breaks = 0;
        $peak   = $startBal;
        $lowest = $startBal;
        $maxDrawdownAbs = '0';
        $peakSoFar      = $startBal;

        foreach ($entries as $e) {
            if ($e['result'] === 'W') $wins++;
            elseif ($e['result'] === 'L') $losses++;
            else $breaks++;

            $bal = $e['balance'];
            if (bccomp($bal, $peak, self::SCALE) > 0) $peak = $bal;
            if (bccomp($bal, $lowest, self::SCALE) < 0) $lowest = $bal;

            // drawdown from running peak
            if (bccomp($bal, $peakSoFar, self::SCALE) > 0) $peakSoFar = $bal;
            $dd = bcsub($peakSoFar, $bal, self::SCALE);
            if (bccomp($dd, $maxDrawdownAbs, self::SCALE) > 0) $maxDrawdownAbs = $dd;
        }

        $total      = count($entries);
        $wlTotal    = $wins + $losses;
        $winRate    = $wlTotal > 0 ? round($wins / $wlTotal * 100, 2) : null;
        $finalBal   = count($entries) > 0 ? end($entries)['balance'] : $startBal;
        $netProfit  = bcsub($finalBal, $startBal, self::SCALE);
        $totalRetPct = bccomp($startBal, '0', self::SCALE) !== 0
            ? round((float)bcdiv($netProfit, $startBal, self::SCALE) * 100, 2)
            : null;
        $maxDdPct   = bccomp($peak, '0', self::SCALE) !== 0
            ? round((float)bcdiv($maxDrawdownAbs, $peak, self::SCALE) * 100, 2)
            : null;

        // Streaks (overall)
        $longestWin  = self::longestStreak($entries, 'W');
        $longestLoss = self::longestStreak($entries, 'L');

        // Streaks per market
        $lossPerMarket = [];
        $winPerMarket  = [];
        foreach ($markets as $market) {
            $mEntries = array_map(fn($t) => ['result' => $t['result']], $market['trades']);
            $lStreak  = self::longestStreakDetails($mEntries, 'L');
            $wStreak  = self::longestStreakDetails($mEntries, 'W');
            if ($lStreak['length'] > 0) {
                $lossPerMarket[] = [
                    'market' => $market['name'],
                    'length' => $lStreak['length'],
                    'start'  => $lStreak['start'],
                    'end'    => $lStreak['end'],
                ];
            }
            if ($wStreak['length'] > 0) {
                $winPerMarket[] = [
                    'market' => $market['name'],
                    'length' => $wStreak['length'],
                    'start'  => $wStreak['start'],
                    'end'    => $wStreak['end'],
                ];
            }
        }

        // Sort per-market streaks descending
        usort($lossPerMarket, fn($a, $b) => $b['length'] <=> $a['length']);
        usort($winPerMarket,  fn($a, $b) => $b['length'] <=> $a['length']);

        return [
            'total'                => $total,
            'wins'                 => $wins,
            'losses'               => $losses,
            'breakeven'            => $breaks,
            'win_rate'             => $winRate,
            'final_balance'        => $finalBal,
            'net_profit'           => $netProfit,
            'total_return_pct'     => $totalRetPct,
            'peak_balance'         => $peak,
            'lowest_balance'       => $lowest,
            'max_drawdown_abs'     => $maxDrawdownAbs,
            'max_drawdown_pct'     => $maxDdPct,
            'longest_win_streak'   => $longestWin,
            'longest_loss_streak'  => $longestLoss,
            'longest_loss_per_market' => $lossPerMarket,
            'longest_win_per_market'  => $winPerMarket,
        ];
    }

    private static function longestStreak(array $entries, string $type): int
    {
        $max = 0;
        $cur = 0;
        foreach ($entries as $e) {
            if ($e['result'] === $type) {
                $cur++;
                if ($cur > $max) $max = $cur;
            } else {
                $cur = 0;
            }
        }
        return $max;
    }

    private static function longestStreakDetails(array $entries, string $type): array
    {
        $max = 0; $cur = 0;
        $start = 0; $end = 0;
        $curStart = 1;
        foreach ($entries as $i => $e) {
            $pos = $i + 1; // 1-indexed trade position within market
            if ($e['result'] === $type) {
                if ($cur === 0) $curStart = $pos;
                $cur++;
                if ($cur > $max) {
                    $max   = $cur;
                    $start = $curStart;
                    $end   = $pos;
                }
            } else {
                $cur = 0;
            }
        }
        return ['length' => $max, 'start' => $start, 'end' => $end];
    }

    private static function str($val): string
    {
        // Convert to canonical decimal string safe for bcmath
        return number_format((float)$val, self::SCALE, '.', '');
    }
}
