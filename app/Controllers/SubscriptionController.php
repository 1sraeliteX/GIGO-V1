<?php

namespace App\Controllers;

use App\Core\Middleware;
use App\Core\Request;
use App\Core\Database;
use App\Services\EmailService;

class SubscriptionController
{
    private function paystackRequest(string $path, string $method = 'GET', ?array $data = null): array
    {
        $keys = \App\Models\PaymentSetting::paystackKeys();
        $secret = $keys['secret_key'];

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
            $db = Database::getInstance();
            $stmt = $db->query(
                "SELECT plan_key, label, days, amount_usd, ngn_rate, description, payment_link, is_active
                 FROM plan_settings WHERE is_active = 1 ORDER BY days ASC"
            );
            $rows = $stmt->fetchAll();

            // Shape into the keyed object the frontend already expects:
            // { monthly: { label, days, amount, ngn_rate, description, payment_link }, ... }
            $plans = [];
            foreach ($rows as $row) {
                $plans[$row['plan_key']] = [
                    'label'        => $row['label'],
                    'days'         => (int)   $row['days'],
                    'amount'       => (float) $row['amount_usd'],
                    'ngn_rate'     => (int)   $row['ngn_rate'],
                    'description'  => $row['description'],
                    'payment_link' => $row['payment_link'] ?? null,
                ];
            }

            // Fallback to config if DB table is somehow empty
            if (empty($plans)) {
                $config = require __DIR__ . '/../../config/config.php';
                $plans  = $config['paystack']['plans'];
            }

            echo json_encode(['plans' => $plans, 'checkout_enabled' => !empty(\App\Models\PaymentSetting::paystackKeys()['secret_key'])]);
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

            // Load plan from DB (authoritative source), fall back to config
            $db = Database::getInstance();
            $keys = \App\Models\PaymentSetting::paystackKeys();
            $planRow = $db->prepare('SELECT label, days, amount_usd, ngn_rate FROM plan_settings WHERE plan_key = :key AND is_active = 1 LIMIT 1');
            $planRow->execute([':key' => $planType]);
            $planData = $planRow->fetch();

            if (!$planData) {
                // Try config fallback
                $plans = $config['paystack']['plans'];
                if (!isset($plans[$planType])) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Invalid plan type']);
                    return;
                }
                $planData = ['days' => $plans[$planType]['days'], 'amount_usd' => $plans[$planType]['amount'], 'ngn_rate' => 1400];
            }

            if (empty($keys['secret_key'])) {
                http_response_code(422);
                echo json_encode(['error' => 'Online payment is not configured yet. Please contact the admin.']);
                return;
            }

            // Charge in NGN: USD price converted at the plan's ngn_rate, in kobo.
            $amountNgn = (int) round((float) $planData['amount_usd'] * (int) ($planData['ngn_rate'] ?? 1400));
            $amountKobo = $amountNgn * 100;
            $reference  = 'SUB-' . $user['sub'] . '-' . time();

            $result = $this->paystackRequest('/transaction/initialize', 'POST', [
                'email' => $user['email'],
                'amount' => $amountKobo,
                'currency' => 'NGN',
                'reference' => $reference,
                'metadata' => [
                    'user_id'   => $user['sub'],
                    'plan_type' => $planType,
                    'days'      => $planData['days'],
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
            $userId = (int) $user['sub'];

            $sub = $this->activateSubscription($userId, $planType, $daysToAdd, $reference);

            echo json_encode([
                'message' => 'Subscription activated successfully',
                'days_remaining' => $sub['days_remaining'],
                'plan_type' => $planType,
                'end_date' => $sub['end_date'],
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Verification failed: ' . $e->getMessage()]);
        }
    }

    /**
     * Idempotent activation: one Paystack reference activates exactly once.
     * Extends the current active subscription if one exists, otherwise starts now.
     */
    private function activateSubscription(int $userId, string $planType, int $daysToAdd, string $reference): array
    {
        $db = Database::getInstance();

        $dup = $db->prepare('SELECT id, end_date FROM subscriptions WHERE paystack_reference = :ref LIMIT 1');
        $dup->execute([':ref' => $reference]);
        if ($existing = $dup->fetch()) {
            $days = max(0, (int) (new \DateTime())->diff(new \DateTime($existing['end_date']))->format('%a'));
            return ['end_date' => $existing['end_date'], 'days_remaining' => $days];
        }

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

        $daysRemaining = max(0, (int) (new \DateTime())->diff($endDate)->format('%a'));

        try {
            $uStmt = $db->prepare('SELECT name, email FROM users WHERE id = :id');
            $uStmt->execute([':id' => $userId]);
            if ($u = $uStmt->fetch()) {
                EmailService::sendTemplate($u['email'], 'subscription_confirmed', [
                    'name' => $u['name'],
                    'plan' => ucfirst($planType),
                    'days' => (string) $daysToAdd,
                ]);
            }
        } catch (\Throwable $e) {
            error_log('subscription_confirmed email failed: ' . $e->getMessage());
        }

        return ['end_date' => $endDate->format('Y-m-d H:i:s'), 'days_remaining' => $daysRemaining];
    }

    /**
     * POST /api/paystack/webhook — server-to-server, no session auth.
     * Authenticity comes from the x-paystack-signature HMAC (SHA-512 of the raw
     * body with the secret key). Activates subscriptions even if the user
     * closed the browser before the redirect/verify step.
     */
    public function webhook(): void
    {
        $raw = file_get_contents('php://input');
        $signature = $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? '';
        $keys = \App\Models\PaymentSetting::paystackKeys();

        if (empty($keys['secret_key']) || $signature === '' ||
            !hash_equals(hash_hmac('sha512', $raw, $keys['secret_key']), $signature)) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid signature']);
            return;
        }

        $event = json_decode($raw, true);
        if (($event['event'] ?? '') !== 'charge.success') {
            echo json_encode(['status' => 'ignored']);
            return;
        }

        $tx = $event['data'] ?? [];
        $meta = $tx['metadata'] ?? [];
        $userId = (int) ($meta['user_id'] ?? 0);
        $reference = $tx['reference'] ?? '';

        if ($userId <= 0 || $reference === '' || ($tx['status'] ?? '') !== 'success') {
            echo json_encode(['status' => 'ignored']);
            return;
        }

        // Metadata is trustworthy here: the payload is signed with our secret key.
        $this->activateSubscription($userId, $meta['plan_type'] ?? 'monthly', (int) ($meta['days'] ?? 30), $reference);
        echo json_encode(['status' => 'ok']);
    }
}