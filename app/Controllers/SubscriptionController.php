<?php

namespace App\Controllers;

use App\Core\Middleware;
use App\Core\Request;
use App\Core\Database;

class SubscriptionController
{
    private function paystackRequest(string $path, string $method = 'GET', ?array $data = null): array
    {
        $config = require __DIR__ . '/../../config/config.php';
        $secret = $config['paystack']['secret_key'];

        $ch = curl_init('https://api.paystack.co/' . ltrim($path, '/'));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $secret,
                'Content-Type: application/json',
            ],
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data ?? []));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $body = json_decode($response, true);
        return ['status' => $httpCode, 'body' => $body ?: []];
    }

    public function status(): void
    {
        try {
            $user = Middleware::authenticate();
            $db = Database::getInstance();

            // Check subscription_override — if set, user is treated as permanently subscribed
            // regardless of any Paystack subscription record.
            $userRecord = \App\Models\User::findById((int) $user['sub']);
            if ($userRecord && !empty($userRecord['subscription_override'])) {
                // If admin set a specific end date, calculate real days remaining
                // If no end date is set (unlimited), return null days_remaining so
                // the frontend can show "∞" instead of a bogus number.
                $daysRemaining = null;
                $endDate       = null;
                if (!empty($userRecord['subscription_override_end'])) {
                    $end  = new \DateTime($userRecord['subscription_override_end']);
                    $now  = new \DateTime();
                    $diff = (int) $now->diff($end)->format('%r%a');
                    $daysRemaining = max(0, $diff);
                    $endDate       = $userRecord['subscription_override_end'];
                }
                echo json_encode([
                    'subscribed'     => true,
                    'days_remaining' => $daysRemaining,
                    'plan_type'      => 'override',
                    'end_date'       => $endDate,
                    'override'       => true,
                ]);
                return;
            }

            $stmt = $db->prepare(
                "SELECT id, plan_type, start_date, end_date, status, created_at
                 FROM subscriptions
                 WHERE user_id = :user_id AND status = 'active'
                 ORDER BY end_date DESC
                 LIMIT 1"
            );
            $stmt->execute([':user_id' => $user['sub']]);
            $sub = $stmt->fetch();

            if (!$sub) {
                echo json_encode(['subscribed' => false, 'days_remaining' => 0]);
                return;
            }

            $now = date('Y-m-d H:i:s');
            if ($sub['end_date'] < $now) {
                $db->prepare("UPDATE subscriptions SET status = 'expired' WHERE id = :id")
                   ->execute([':id' => $sub['id']]);
                echo json_encode(['subscribed' => false, 'days_remaining' => 0]);
                return;
            }

            $end = new \DateTime($sub['end_date']);
            $nowDt = new \DateTime();
            $days = max(0, (int) $nowDt->diff($end)->format('%a'));

            echo json_encode([
                'subscribed' => true,
                'days_remaining' => $days,
                'plan_type' => $sub['plan_type'],
                'end_date' => $sub['end_date'],
                'subscription_id' => $sub['id'],
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch subscription: ' . $e->getMessage()]);
        }
    }

    public function plans(): void
    {
        try {
            $config = require __DIR__ . '/../../config/config.php';
            echo json_encode(['plans' => $config['paystack']['plans']]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch plans: ' . $e->getMessage()]);
        }
    }

    public function initialize(): void
    {
        try {
            $user = Middleware::authenticate();
            $data = Request::body();

            $planType = $data['plan_type'] ?? '';
            $config = require __DIR__ . '/../../config/config.php';
            $plans = $config['paystack']['plans'];

            if (!isset($plans[$planType])) {
                http_response_code(422);
                echo json_encode(['error' => 'Invalid plan type']);
                return;
            }

            $plan = $plans[$planType];
            $amountKobo = $plan['amount'] * 100;
            $reference = 'SUB-' . $user['sub'] . '-' . time();

            $result = $this->paystackRequest('/transaction/initialize', 'POST', [
                'email' => $user['email'],
                'amount' => $amountKobo,
                'reference' => $reference,
                'metadata' => [
                    'user_id' => $user['sub'],
                    'plan_type' => $planType,
                    'days' => $plan['days'],
                ],
                'callback_url' => $config['app']['url'] . '/subscribe/callback',
            ]);

            if (!($result['body']['status'] ?? false)) {
                http_response_code(502);
                $msg = $result['body']['message'] ?? 'Failed to initialize payment';
                echo json_encode(['error' => $msg]);
                return;
            }

            echo json_encode([
                'authorization_url' => $result['body']['data']['authorization_url'],
                'reference' => $reference,
                'access_code' => $result['body']['data']['access_code'] ?? '',
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Payment initialization failed: ' . $e->getMessage()]);
        }
    }

    public function verify(): void
    {
        try {
            $user = Middleware::authenticate();
            $reference = Request::query('reference');

            if (!$reference) {
                http_response_code(422);
                echo json_encode(['error' => 'Reference is required']);
                return;
            }

            $result = $this->paystackRequest('/transaction/verify/' . urlencode($reference));

            if (!($result['body']['status'] ?? false)) {
                http_response_code(502);
                echo json_encode(['error' => 'Payment verification failed']);
                return;
            }

            $tx = $result['body']['data'];
            if (($tx['status'] ?? '') !== 'success') {
                http_response_code(402);
                echo json_encode(['error' => 'Payment was not successful']);
                return;
            }

            $meta = $tx['metadata'] ?? [];
            $planType  = $meta['plan_type'] ?? 'monthly';
            $daysToAdd = (int) ($meta['days'] ?? 30);
            // Always use the authenticated user's ID — never trust metadata from Paystack
            // as it could be tampered with to activate another user's subscription.
            $userId = $user['sub'];

            $db = Database::getInstance();

            $stmt = $db->prepare(
                "SELECT id, end_date FROM subscriptions
                 WHERE user_id = :user_id AND status = 'active'
                 ORDER BY end_date DESC LIMIT 1"
            );
            $stmt->execute([':user_id' => $userId]);
            $existing = $stmt->fetch();

            $now = new \DateTime();

            if ($existing && $existing['end_date'] >= $now->format('Y-m-d H:i:s')) {
                $startDate = new \DateTime($existing['end_date']);
                $startDate->modify('+1 second');
            } else {
                if ($existing) {
                    $db->prepare("UPDATE subscriptions SET status = 'expired' WHERE id = :id")
                       ->execute([':id' => $existing['id']]);
                }
                $startDate = $now;
            }

            $endDate = clone $startDate;
            $endDate->modify('+' . $daysToAdd . ' days');

            $insert = $db->prepare(
                "INSERT INTO subscriptions (user_id, plan_type, days_added, start_date, end_date, status, paystack_reference)
                 VALUES (:user_id, :plan_type, :days_added, :start_date, :end_date, 'active', :reference)"
            );
            $insert->execute([
                ':user_id' => $userId,
                ':plan_type' => $planType,
                ':days_added' => $daysToAdd,
                ':start_date' => $startDate->format('Y-m-d H:i:s'),
                ':end_date' => $endDate->format('Y-m-d H:i:s'),
                ':reference' => $reference,
            ]);

            $daysRemaining = (int) (new \DateTime())->diff($endDate)->format('%a');

            echo json_encode([
                'message' => 'Subscription activated successfully',
                'days_remaining' => $daysRemaining,
                'plan_type' => $planType,
                'end_date' => $endDate->format('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Verification failed: ' . $e->getMessage()]);
        }
    }
}