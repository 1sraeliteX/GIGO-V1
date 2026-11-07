<?php

/**
 * Grind Report fixture test. Run: php tests/grind_report_test.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Services\GrindReportService;

$failures = 0;
function check(string $label, $expected, $actual): void
{
    global $failures;
    if ($expected === $actual) {
        echo "PASS: {$label}\n";
    } else {
        $failures++;
        echo "FAIL: {$label} — expected " . var_export($expected, true) . ", got " . var_export($actual, true) . "\n";
    }
}

function fixtureTrades(string $market, string $sequence, string $date): array
{
    $trades = [];
    foreach (str_split($sequence) as $i => $ch) {
        $trades[] = [
            'id' => count($trades) + 1 + ($market === 'CRASH 99' ? 100 : 0),
            'trade_date' => $date,
            'created_at' => $date . ' ' . sprintf('%02d:00:00', $i),
            'pair' => $market,
            'result' => $ch === 'W' ? 'win' : 'loss',
            'pnl_amount' => $ch === 'W' ? 40 : -10,
        ];
    }
    return $trades;
}

$settings = ['start_balance' => 1000, 'win_amount' => 40, 'loss_amount' => 10, 'pnl_mode' => 'fixed'];
$trades = array_merge(
    fixtureTrades('VOL 10', 'WLLLWLLLLLLLLLWWWW', '2026-01-01'),
    fixtureTrades('CRASH 99', 'LWLWLLLWWLLWLLWLLLWLLL', '2026-01-02')
);

$report = GrindReportService::compute($trades, $settings);
$stats = $report['stats'];

check('market count', 2, count($report['markets']));
check('market order', ['VOL 10', 'CRASH 99'], array_column($report['markets'], 'name'));

$vol = $report['markets'][0];
check('VOL 10 trades', 18, count($vol['trades']));
check('VOL 10 wins', 6, $vol['wins']);
check('VOL 10 losses', 12, $vol['losses']);
check('VOL 10 end balance', 1120.0, $vol['end_balance']);

$crash = $report['markets'][1];
check('CRASH 99 trades', 22, count($crash['trades']));
check('CRASH 99 wins', 7, $crash['wins']);
check('CRASH 99 losses', 15, $crash['losses']);
check('CRASH 99 end balance', 1250.0, $crash['end_balance']);

check('total trades', 40, $stats['total_trades']);
check('total wins', 13, $stats['wins']);
check('total losses', 27, $stats['losses']);
check('final balance', 1250.0, $stats['final_balance']);
check('peak balance', 1280.0, $stats['peak_balance']);
check('lowest balance', 960.0, $stats['lowest_balance']);
check('net profit', 250.0, $stats['net_profit']);
check('total return %', 25.0, $stats['total_return_pct']);
check('longest losing streak length', 9, $stats['longest_loss_streak']['length']);
check('longest losing streak market', 'VOL 10', $stats['longest_loss_streak']['market']);
check('longest losing streak range', [6, 14], [$stats['longest_loss_streak']['from'], $stats['longest_loss_streak']['to']]);
check('log entries incl. trade 0', 41, count($report['log']));
check('trade 0 balance', 1000.0, $report['log'][0]['balance']);
check('trade 40 balance', 1250.0, $report['log'][40]['balance']);

// Breakeven trades are excluded
$withBe = array_merge($trades, [[
    'id' => 999, 'trade_date' => '2026-01-03', 'created_at' => '2026-01-03 00:00:00',
    'pair' => 'VOL 10', 'result' => 'win', 'pnl_amount' => 0,
]]);
$beReport = GrindReportService::compute($withBe, $settings);
check('breakeven excluded', 40, $beReport['stats']['total_trades']);

// Actual mode uses recorded P/L
$actualTrades = [
    ['id' => 1, 'trade_date' => '2026-01-01', 'created_at' => '2026-01-01 00:00:00', 'pair' => 'VOL 10', 'result' => 'win', 'pnl_amount' => 55.25],
    ['id' => 2, 'trade_date' => '2026-01-01', 'created_at' => '2026-01-01 01:00:00', 'pair' => 'VOL 10', 'result' => 'loss', 'pnl_amount' => -12.10],
];
$actualReport = GrindReportService::compute($actualTrades, array_merge($settings, ['pnl_mode' => 'actual']));
check('actual mode final balance', 1043.15, $actualReport['stats']['final_balance']);

// Empty input
$empty = GrindReportService::compute([], $settings);
check('no trades', 0, $empty['stats']['total_trades']);
check('no trades final balance', 1000.0, $empty['stats']['final_balance']);

// Manual market order overrides first-trade-date order
$manual = GrindReportService::compute($trades, array_merge($settings, ['market_order' => ['CRASH 99', 'VOL 10']]));
check('manual market order', ['CRASH 99', 'VOL 10'], array_column($manual['markets'], 'name'));
check('manual order same final balance', 1250.0, $manual['stats']['final_balance']);

echo $failures === 0 ? "\nAll tests passed.\n" : "\n{$failures} test(s) FAILED.\n";
exit($failures === 0 ? 0 : 1);