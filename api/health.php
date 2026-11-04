<?php
// GET /api/health.php
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

run('GET', function () {
    send(200, ['ok' => true, 'crm' => crm()->mode]);
});
