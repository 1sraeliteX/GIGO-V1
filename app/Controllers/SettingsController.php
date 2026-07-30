<?php

namespace App\Controllers;

use App\Core\Middleware;
use App\Core\Request;
use App\Models\User;

class SettingsController
{
    public function show(): void
    {
        try {
            $user = Middleware::authenticate();
            $record = User::findById($user['sub']);

            if (!$record) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                return;
            }

            echo json_encode([
                'max_trades_per_day' => $record['max_trades_per_day'] ?? null,
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch settings: ' . $e->getMessage()]);
        }
    }

    public function update(): void
    {
        try {
            $user = Middleware::authenticate();
            $data = Request::body();

            $value = $data['max_trades_per_day'] ?? null;

            if ($value !== null) {
                $value = (int) $value;
                if ($value < 1) {
                    http_response_code(422);
                    echo json_encode(['error' => 'max_trades_per_day must be at least 1']);
                    return;
                }
            }

            User::updateMaxTradesPerDay($user['sub'], $value);

            echo json_encode([
                'message' => 'Settings updated',
                'max_trades_per_day' => $value,
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update settings: ' . $e->getMessage()]);
        }
    }
}
