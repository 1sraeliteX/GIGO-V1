<?php

$docroot = __DIR__;
$candidates = [
    // Web root = <project>/public
    dirname($docroot) . '/index.php',
    // cPanel layout: public_html with backend in a sibling gigo folder
    dirname($docroot) . '/gigo/index.php',
    // cPanel layout: public_html/app -> /home/USER/gigo/index.php
    dirname(dirname($docroot)) . '/gigo/index.php',
];

foreach ($candidates as $entry) {
    if (is_file($entry)) {
        require $entry;
        return;
    }
}

http_response_code(500);
header('Content-Type: application/json');
echo json_encode(['error' => 'Backend entry point not found']);
