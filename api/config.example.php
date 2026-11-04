<?php
// Copy this file to config.php and fill in the three Zoho keys. config.php is blocked by .htaccess.
// Nothing is stored on this server: each registration is checked and sent straight to the CRM.

return [
    // Which fests this API takes. Event rules are read from each site's assets/events.js.
    'FESTS' => 'inara',
    'EVENTS_FILES' => ['inara' => __DIR__ . '/../assets/events.js'],

    // Where registrations go: zoho_function (the CRM team's fest function; Inara registrations are labelled "Inara 2026"), or log for testing
    // (writes a line without personal details to the PHP error log and sends nothing).
    'CRM_MODE' => 'zoho_function',

    // The CRM team's function and its keys
    'ZOHO_FUNCTION_URL' => 'https://www.zohoapis.com/crm/v7/functions/afkar_challenge_api/actions/execute',
    'ZOHO_ACCOUNTS' => 'https://accounts.zoho.com',
    'ZOHO_CLIENT_ID' => '',
    'ZOHO_CLIENT_SECRET' => '',
    'ZOHO_REFRESH_TOKEN' => '',

    // The Zoho login token lasts an hour and is reused from a small file in this folder.
    // Empty means the system temp folder.
    'TOKEN_DIR' => '',
];
