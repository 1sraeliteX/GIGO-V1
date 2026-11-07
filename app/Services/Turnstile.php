<?php

namespace App\Services;

class Turnstile
{
    public static function verify($token, string $expectedAction): bool
    {
        if (!is_string($token) || $token === '' || strlen($token) > 2048) {
            return false;
        }

        $secret = $_ENV['TURNSTILE_SECRET'] ?? '';
        $hostnames = array_values(array_filter(array_map(
            'trim',
            explode(',', $_ENV['TURNSTILE_HOSTNAMES'] ?? '')
        )));

        if (!is_string($secret) || $secret === '' || $hostnames === []) {
            return false;
        }

        $clientIp = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
        if (!filter_var($clientIp, FILTER_VALIDATE_IP)) {
            $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
            $clientIp = $forwarded !== '' ? trim(explode(',', $forwarded)[0]) : '';
        }
        if (!filter_var($clientIp, FILTER_VALIDATE_IP)) {
            $clientIp = $_SERVER['REMOTE_ADDR'] ?? '';
        }

        $payload = [
            'secret' => $secret,
            'response' => $token,
        ];
        if (filter_var($clientIp, FILTER_VALIDATE_IP)) {
            $payload['remoteip'] = $clientIp;
        }

        $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($payload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 10,
        ]);

        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($body === false || $status < 200 || $status >= 300) {
            return false;
        }

        $result = json_decode($body, true);
        if (!is_array($result)) {
            return false;
        }

        return ($result['success'] ?? false) === true
            && ($result['action'] ?? '') === $expectedAction
            && in_array($result['hostname'] ?? '', $hostnames, true);
    }
}
