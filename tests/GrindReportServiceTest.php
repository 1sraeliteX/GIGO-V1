<?php

/**
 * GrindReportServiceTest
 *
 * Verifies the fixture from the spec:
 *
 *   Row 1 VOL 10:    W L L L W L L L L L L L L L W W W W  (18 trades, 6 W, 12 L)
 *   Row 2 CRASH 99:  L W L W L L L W W L L W L L W L L L W L L L (22 trades, 7 W, 15 L)
 *
 *   Settings: start=1000, +40 W, -10 L, pnl_mode=fixed
 *
 *   Expected:
 *     total trades = 40
 *     wins  = 13, losses = 27
 *     final balance = 1250  (13*40 - 27*10 = 520 - 270 = 250 net; 1000+250=1250)
 *     peak  = 1280
 *     lowest = 960
 *     longest losing streak = 9  (VOL 10, trades 6–14 within that market)
 *
 * Run with:
 *   php tests/GrindReportServiceTest.php
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../app/Services/GrindReportService.php';

use App\Services\GrindReportService;

// -------------------------------------------------------------------------
// Build synthetic trade rows (mimicking DB rows, no DB needed)
// -------------------------------------------------------------------------

function makeTrade(int $id, string $pair, string $result, float $pnl, string $date): array
{
    return [
        'id'         => $id,
        'pair'       => $pair,
        'result'     => $result,  // 'win' | 'loss'
        'pnl_amount' => $pnl,
        'trade_date' => $date,
        'created_at' => $date . ' 00:00:00',
    ];
}

// VOL 10:   W L L L W L L L L L L L L L W W W W
$vol10Pattern = ['W','L','L','L','W','L','L','L','L','L','L','L','L','L','W','W','W','W'];
// CRASH 99: L W L W L L L W W L L W L L W L L L W L L L
$crash99Pattern = ['L','W','L','W','L','L','L','W','W','L','L','W','L','L','W','L','L','L','W','L','L','L'];

$trades = [];
$id = 1;
$baseDate = '2024-01-01';

// VOL 10 trades
foreach ($vol10Pattern as $i => $r) {
    $result = $r === 'W' ? 'win' : 'loss';
    $pnl    = $r === 'W' ? 40.0 : -10.0;
    $date   = date('Y-m-d', strtotime($baseDate . ' +' . $i . ' days'));
    $trades[] = makeTrade($id++, 'VOL 10', $result, $pnl, $date);
}

// CRASH 99 trades (start from day 100 so they come after VOL 10 by date)
foreach ($crash99Pattern as $i => $r) {
    $result = $r === 'W' ? 'win' : 'loss';
    $pnl    = $r === 'W' ? 40.0 : -10.0;
    $date   = date('Y-m-d', strtotime($baseDate . ' +' . (100 + $i) . ' days'));
    $trades[] = makeTrade($id++, 'CRASH 99', $result, $pnl, $date);
}

$settings = [
    'start_balance' => 1000.0,
    'win_amount'    => 40.0,
    'loss_amount'   => 10.0,
    'pnl_mode'      => 'fixed',
];

$report = GrindReportService::build($settings, $trades);

// -------------------------------------------------------------------------
// Assertions
// -------------------------------------------------------------------------

$pass = 0;
$fail = 0;

function assert_eq(string $label, $expected, $actual): void
{
    global $pass, $fail;
    // Allow float comparison within a small epsilon
    if (is_float($expected) || is_float($actual)) {
        $ok = abs((float)$expected - (float)$actual) < 0.005;
    } else {
        $ok = ($expected == $actual);
    }
    if ($ok) {
        echo "  PASS  {$label}\n";
        $pass++;
    } else {
        echo "  FAIL  {$label} — expected " . json_encode($expected) . ", got " . json_encode($actual) . "\n";
        $fail++;
    }
}

echo "\n=== GrindReportService — Fixture Test ===\n\n";

$stats = $report['stats'];

// Market grouping
assert_eq('Number of markets', 2, count($report['markets']));
assert_eq('Market 0 name', 'VOL 10', $report['markets'][0]['name']);
assert_eq('Market 1 name', 'CRASH 99', $report['markets'][1]['name']);

// VOL 10 counts
$vol = $report['markets'][0];
assert_eq('VOL 10 total trades',  18, $vol['total']);
assert_eq('VOL 10 wins',           6, $vol['wins']);
assert_eq('VOL 10 losses',        12, $vol['losses']);

// CRASH 99 counts
$crash = $report['markets'][1];
assert_eq('CRASH 99 total trades', 22, $crash['total']);
assert_eq('CRASH 99 wins',          7, $crash['wins']);
assert_eq('CRASH 99 losses',       15, $crash['losses']);

// Combined stats
assert_eq('Total trades',  40, $stats['total']);
assert_eq('Total wins',    13, $stats['wins']);
assert_eq('Total losses',  27, $stats['losses']);

// Balance
assert_eq('Final balance', 1250.0, (float)$stats['final_balance']);
assert_eq('Peak balance',  1280.0, (float)$stats['peak_balance']);
assert_eq('Lowest balance', 960.0, (float)$stats['lowest_balance']);

// Longest losing streak
assert_eq('Longest losing streak (overall)', 9, $stats['longest_loss_streak']);

// Find the VOL 10 streak in per-market data
$vol10LossStreak = null;
foreach ($stats['longest_loss_per_market'] as $item) {
    if ($item['market'] === 'VOL 10') {
        $vol10LossStreak = $item;
        break;
    }
}
assert_eq('VOL 10 longest loss streak length', 9, $vol10LossStreak['length'] ?? null);
assert_eq('VOL 10 longest loss streak start',  6, $vol10LossStreak['start']  ?? null);
assert_eq('VOL 10 longest loss streak end',   14, $vol10LossStreak['end']    ?? null);

// Log length (40 trades + 1 start = 41 entries)
assert_eq('Log length (including trade 0)', 41, count($report['log']));

// Net profit check
assert_eq('Net profit', 250.0, (float)$stats['net_profit']);

// Win rate  (13/40 overall, but rate is wins / (wins+losses) = 13/40 = 32.5)
assert_eq('Win rate %', 32.5, (float)$stats['win_rate']);

// -------------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------------
echo "\n";
echo str_repeat('-', 44) . "\n";
echo "  PASSED: {$pass} · FAILED: {$fail}\n";
echo str_repeat('-', 44) . "\n\n";

if ($fail > 0) exit(1);
