<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Middleware;
use App\Core\Request;

class AdminController
{
    // -------------------------------------------------------------------------
    // GET /api/admin/users
    // Returns paginated list of all users with their active subscription summary.
    // -------------------------------------------------------------------------
    public function listUsers(): void
    {
        try {
            Middleware::authorizeAdmin();
            $db = Database::getInstance();

            $page  = max(1, (int) Request::query('page', 1));
            $limit = max(1, min(100, (int) Request::query('limit', 50)));
            $offset = ($page - 1) * $limit;

            $search = trim(Request::query('search', '') ?? '');

            $where  = '';
            $params = [];
            if ($search !== '') {
                $where = "WHERE (u.name LIKE :search OR u.email LIKE :search)";
                $params[':search'] = '%' . $search . '%';
            }

            // Total count
            $countStmt = $db->prepare("SELECT COUNT(*) as total FROM users u $where");
            $countStmt->execute($params);
            $total = (int) ($countStmt->fetch()['total'] ?? 0);

            // User rows + active sub summary via subquery
            $sql = "
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.is_admin,
                    u.subscription_override,
                    u.subscription_override_end,
                    u.max_trades_per_day,
                    u.created_at,
                    s.plan_type      AS active_plan,
                    s.end_date       AS sub_end_date,
                    s.status         AS sub_status
                FROM users u
                LEFT JOIN (
                    SELECT user_id, plan_type, end_date, status
                    FROM subscriptions
                    WHERE status = 'active'
                    ORDER BY end_date DESC
                ) s ON s.user_id = u.id
                $where
                GROUP BY u.id
                ORDER BY u.created_at DESC
                LIMIT :limit OFFSET :offset
            ";

            $params[':limit']  = $limit;
            $params[':offset'] = $offset;

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $users = $stmt->fetchAll();

            // Cast integer-like booleans
            $users = array_map(function ($u) {
                $u['is_admin']              = (bool) $u['is_admin'];
                $u['subscription_override'] = (bool) $u['subscription_override'];
                return $u;
            }, $users);

            echo json_encode([
                'users' => $users,
                'total' => $total,
                'page'  => $page,
                'limit' => $limit,
                'pages' => (int) ceil($total / $limit),
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch users: ' . $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // PUT /api/admin/users/{id}
    // Update name, email, is_admin, subscription_override, max_trades_per_day.
    // -------------------------------------------------------------------------
    public function updateUser(int $id): void
    {
        try {
            $admin = Middleware::authorizeAdmin();
            $db    = Database::getInstance();
            $data  = Request::body();

            // Make sure the user exists
            $existing = $db->prepare('SELECT id, is_admin FROM users WHERE id = :id LIMIT 1');
            $existing->execute([':id' => $id]);
            $row = $existing->fetch();

            if (!$row) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                return;
            }

            // Safety: prevent the calling admin from revoking their own admin flag
            if ((int) $id === (int) $admin['sub'] && isset($data['is_admin']) && !$data['is_admin']) {
                http_response_code(422);
                echo json_encode(['error' => 'You cannot revoke your own admin access']);
                return;
            }

            $fields  = [];
            $params  = [':id' => $id];

            if (array_key_exists('name', $data) && trim((string) $data['name']) !== '') {
                $fields[] = 'name = :name';
                $params[':name'] = trim((string) $data['name']);
            }

            if (array_key_exists('email', $data) && filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                // Check uniqueness (ignore self)
                $chk = $db->prepare('SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1');
                $chk->execute([':email' => $data['email'], ':id' => $id]);
                if ($chk->fetch()) {
                    http_response_code(409);
                    echo json_encode(['error' => 'Email already in use']);
                    return;
                }
                $fields[] = 'email = :email';
                $params[':email'] = $data['email'];
            }

            if (array_key_exists('is_admin', $data)) {
                $fields[] = 'is_admin = :is_admin';
                $params[':is_admin'] = $data['is_admin'] ? 1 : 0;
            }

            if (array_key_exists('subscription_override', $data)) {
                $fields[] = 'subscription_override = :subscription_override';
                $params[':subscription_override'] = $data['subscription_override'] ? 1 : 0;
            }

            if (array_key_exists('subscription_override_days', $data)) {
                $days = (int) $data['subscription_override_days'];
                if ($days > 0) {
                    $end = new \DateTime();
                    $end->modify("+{$days} days");
                    $fields[] = 'subscription_override_end = :override_end';
                    $params[':override_end'] = $end->format('Y-m-d H:i:s');
                } else {
                    // 0 = clear the end date (unlimited override)
                    $fields[] = 'subscription_override_end = :override_end';
                    $params[':override_end'] = null;
                }
            }

            if (array_key_exists('max_trades_per_day', $data)) {
                $val = $data['max_trades_per_day'];
                $fields[] = 'max_trades_per_day = :max_trades_per_day';
                $params[':max_trades_per_day'] = ($val === null || $val === '') ? null : (int) $val;
            }

            if (empty($fields)) {
                echo json_encode(['message' => 'Nothing to update']);
                return;
            }

            $db->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id')
               ->execute($params);

            echo json_encode(['message' => 'User updated']);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update user: ' . $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // DELETE /api/admin/users/{id}
    // Hard-delete a user (cascades to trades/accounts/subscriptions via FK).
    // -------------------------------------------------------------------------
    public function deleteUser(int $id): void
    {
        try {
            $admin = Middleware::authorizeAdmin();

            if ((int) $id === (int) $admin['sub']) {
                http_response_code(422);
                echo json_encode(['error' => 'You cannot delete your own account']);
                return;
            }

            $db   = Database::getInstance();
            $stmt = $db->prepare('DELETE FROM users WHERE id = :id');
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                return;
            }

            echo json_encode(['message' => 'User deleted']);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete user: ' . $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/admin/users/{id}/subscriptions
    // List all subscription rows for a specific user.
    // -------------------------------------------------------------------------
    public function listUserSubscriptions(int $id): void
    {
        try {
            Middleware::authorizeAdmin();
            $db = Database::getInstance();

            // Verify user exists
            $u = $db->prepare('SELECT id FROM users WHERE id = :id LIMIT 1');
            $u->execute([':id' => $id]);
            if (!$u->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                return;
            }

            $stmt = $db->prepare(
                "SELECT id, plan_type, days_added, start_date, end_date, status, paystack_reference, created_at
                 FROM subscriptions
                 WHERE user_id = :user_id
                 ORDER BY created_at DESC"
            );
            $stmt->execute([':user_id' => $id]);

            echo json_encode(['subscriptions' => $stmt->fetchAll()]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch subscriptions: ' . $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/admin/users/{id}/subscriptions
    // Manually grant a subscription, bypassing Paystack.
    // Body: { plan_type: "monthly"|"quarterly"|"yearly", days: int }
    // -------------------------------------------------------------------------
    public function grantSubscription(int $id): void
    {
        try {
            $admin = Middleware::authorizeAdmin();
            $db    = Database::getInstance();
            $data  = Request::body();

            // Verify user exists
            $u = $db->prepare('SELECT id FROM users WHERE id = :id LIMIT 1');
            $u->execute([':id' => $id]);
            if (!$u->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                return;
            }

            $validPlans = ['monthly', 'quarterly', 'yearly'];
            $planType   = $data['plan_type'] ?? 'monthly';
            if (!in_array($planType, $validPlans, true)) {
                http_response_code(422);
                echo json_encode(['error' => 'Invalid plan_type. Must be monthly, quarterly, or yearly']);
                return;
            }

            $days = (int) ($data['days'] ?? 0);
            if ($days <= 0) {
                http_response_code(422);
                echo json_encode(['error' => 'days must be a positive integer']);
                return;
            }

            // If there is an existing active subscription, extend from its end_date
            $existing = $db->prepare(
                "SELECT id, end_date FROM subscriptions
                 WHERE user_id = :user_id AND status = 'active'
                 ORDER BY end_date DESC LIMIT 1"
            );
            $existing->execute([':user_id' => $id]);
            $current = $existing->fetch();

            $now = new \DateTime();
            if ($current && $current['end_date'] >= $now->format('Y-m-d H:i:s')) {
                $startDate = new \DateTime($current['end_date']);
                $startDate->modify('+1 second');
            } else {
                if ($current) {
                    $db->prepare("UPDATE subscriptions SET status = 'expired' WHERE id = :id")
                       ->execute([':id' => $current['id']]);
                }
                $startDate = $now;
            }

            $endDate = clone $startDate;
            $endDate->modify("+{$days} days");

            $reference = 'ADMIN-' . $admin['sub'] . '-' . time();

            $insert = $db->prepare(
                "INSERT INTO subscriptions (user_id, plan_type, days_added, start_date, end_date, status, paystack_reference)
                 VALUES (:user_id, :plan_type, :days_added, :start_date, :end_date, 'active', :reference)"
            );
            $insert->execute([
                ':user_id'    => $id,
                ':plan_type'  => $planType,
                ':days_added' => $days,
                ':start_date' => $startDate->format('Y-m-d H:i:s'),
                ':end_date'   => $endDate->format('Y-m-d H:i:s'),
                ':reference'  => $reference,
            ]);

            echo json_encode([
                'message'  => 'Subscription granted',
                'end_date' => $endDate->format('Y-m-d H:i:s'),
                'days'     => $days,
                'plan'     => $planType,
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to grant subscription: ' . $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // DELETE /api/admin/subscriptions/{id}
    // Cancel (soft-delete) a specific subscription row.
    // -------------------------------------------------------------------------
    public function revokeSubscription(int $id): void
    {
        try {
            Middleware::authorizeAdmin();
            $db = Database::getInstance();

            $stmt = $db->prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = :id");
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Subscription not found']);
                return;
            }

            echo json_encode(['message' => 'Subscription cancelled']);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to cancel subscription: ' . $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/admin/stats
    // Quick summary numbers for the admin dashboard.
    // -------------------------------------------------------------------------
    public function stats(): void
    {
        try {
            Middleware::authorizeAdmin();
            $db = Database::getInstance();

            $totalUsers  = $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
            $adminUsers  = $db->query('SELECT COUNT(*) FROM users WHERE is_admin = 1')->fetchColumn();
            $overrideUsers = $db->query('SELECT COUNT(*) FROM users WHERE subscription_override = 1')->fetchColumn();

            $now = date('Y-m-d H:i:s');
            $activeSubs = $db->prepare(
                "SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE status = 'active' AND end_date >= :now"
            );
            $activeSubs->execute([':now' => $now]);
            $activeSubs = $activeSubs->fetchColumn();

            $totalTrades = $db->query('SELECT COUNT(*) FROM trades')->fetchColumn();

            echo json_encode([
                'total_users'       => (int) $totalUsers,
                'admin_users'       => (int) $adminUsers,
                'override_users'    => (int) $overrideUsers,
                'active_subscribers'=> (int) $activeSubs,
                'total_trades'      => (int) $totalTrades,
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch stats: ' . $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/admin/plans
    // Returns all plan_settings rows.
    // -------------------------------------------------------------------------
    public function getPlans(): void
    {
        try {
            Middleware::authorizeAdmin();
            $db = Database::getInstance();
            $stmt = $db->query(
                "SELECT id, plan_key, label, days, amount_usd, ngn_rate, description, payment_link, is_active
                 FROM plan_settings ORDER BY days ASC"
            );
            echo json_encode(['plans' => $stmt->fetchAll()]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch plans: ' . $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // PUT /api/admin/plans/{key}
    // Update any fields of a plan by plan_key (monthly | quarterly | yearly).
    // Body: { label, days, amount_usd, ngn_rate, description, payment_link, is_active }
    // -------------------------------------------------------------------------
    public function updatePlan(string $key): void
    {
        try {
            Middleware::authorizeAdmin();
            $db   = Database::getInstance();
            $data = Request::body();

            // Verify the plan exists
            $check = $db->prepare('SELECT id FROM plan_settings WHERE plan_key = :key LIMIT 1');
            $check->execute([':key' => $key]);
            if (!$check->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => "Plan '{$key}' not found"]);
                return;
            }

            $fields = [];
            $params = [':key' => $key];

            if (array_key_exists('label', $data) && trim((string)$data['label']) !== '') {
                $fields[] = 'label = :label';
                $params[':label'] = trim((string)$data['label']);
            }
            if (array_key_exists('days', $data)) {
                $days = (int)$data['days'];
                if ($days < 1) { http_response_code(422); echo json_encode(['error' => 'days must be >= 1']); return; }
                $fields[] = 'days = :days';
                $params[':days'] = $days;
            }
            if (array_key_exists('amount_usd', $data)) {
                $amt = (float)$data['amount_usd'];
                if ($amt < 0) { http_response_code(422); echo json_encode(['error' => 'amount_usd must be >= 0']); return; }
                $fields[] = 'amount_usd = :amount_usd';
                $params[':amount_usd'] = $amt;
            }
            if (array_key_exists('ngn_rate', $data)) {
                $rate = (int)$data['ngn_rate'];
                if ($rate < 1) { http_response_code(422); echo json_encode(['error' => 'ngn_rate must be >= 1']); return; }
                $fields[] = 'ngn_rate = :ngn_rate';
                $params[':ngn_rate'] = $rate;
            }
            if (array_key_exists('description', $data)) {
                $fields[] = 'description = :description';
                $params[':description'] = (string)$data['description'];
            }
            if (array_key_exists('payment_link', $data)) {
                $link = trim((string)$data['payment_link']);
                // Accept empty string (clear the link) or a valid URL
                if ($link !== '' && !filter_var($link, FILTER_VALIDATE_URL)) {
                    http_response_code(422);
                    echo json_encode(['error' => 'payment_link must be a valid URL or empty']);
                    return;
                }
                $fields[] = 'payment_link = :payment_link';
                $params[':payment_link'] = $link === '' ? null : $link;
            }
            if (array_key_exists('is_active', $data)) {
                $fields[] = 'is_active = :is_active';
                $params[':is_active'] = $data['is_active'] ? 1 : 0;
            }

            if (empty($fields)) {
                echo json_encode(['message' => 'Nothing to update']);
                return;
            }

            $fields[] = "updated_at = datetime('now')";
            $db->prepare('UPDATE plan_settings SET ' . implode(', ', $fields) . ' WHERE plan_key = :key')
               ->execute($params);

            // Return the updated row so the frontend can refresh immediately
            $row = $db->prepare(
                'SELECT id, plan_key, label, days, amount_usd, ngn_rate, description, payment_link, is_active FROM plan_settings WHERE plan_key = :key'
            );
            $row->execute([':key' => $key]);

            echo json_encode(['message' => 'Plan updated', 'plan' => $row->fetch()]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update plan: ' . $e->getMessage()]);
        }
    }
}
