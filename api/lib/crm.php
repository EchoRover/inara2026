<?php
// CRM adapters. Personal data (names, emails, phones) goes ONLY through here,
// straight to the campus CRM. Nothing personal is written to our disk.
//
// CRM_MODE=log      development: writes a redacted line to the server log, returns a fake id
// CRM_MODE=webhook  POST the canonical JSON to CRM_URL (an endpoint the CRM team exposes)
// CRM_MODE=zoho     Zoho CRM REST API (OAuth refresh token -> insert record)
// CRM_MODE=zoho_function  a Zoho CRM function exposed as a REST API (ZOHO_FUNCTION_URL), which the
//                   CRM team wrote to create the record; it takes the JSON from zoho_function_payload()
//
// Every adapter returns ['id' => ...] on success and throws on failure.
// The field mapping for Zoho lives in zoho_map_team() below.

declare(strict_types=1);

const CRM_TIMEOUT = 10;

function crm_request(string $method, string $url, array $headers, ?array $body): array
{
    if (!function_exists('curl_init')) throw new RuntimeException('PHP curl extension is missing');
    $h = ['Content-Type: application/json'];
    foreach ($headers as $k => $v) $h[] = "$k: $v";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $h,
        CURLOPT_POSTFIELDS => $body === null ? '' : json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => CRM_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => CRM_TIMEOUT,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    $text = curl_exec($ch);
    if ($text === false) {
        $err = curl_error($ch);
        throw new RuntimeException("CRM request failed: $err");
    }
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $data = $text === '' ? [] : json_decode($text, true);
    if (!is_array($data)) $data = ['raw' => substr($text, 0, 200)];
    if ($code < 200 || $code > 299) throw new RuntimeException("CRM HTTP $code: " . substr($text, 0, 200));
    return $data;
}

// ---------- Zoho CRM ----------
// Needs: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_MODULE_<FEST> (or ZOHO_MODULE)
// Optional: ZOHO_ACCOUNTS (default https://accounts.zoho.com), ZOHO_API (default https://www.zohoapis.com), ZOHO_VERSION
// The access token lasts an hour and Zoho allows only a few refreshes per 10 minutes, so it is kept
// in a private file in the system temp folder (or TOKEN_DIR) and reused until it expires.
function zoho_token_file(): string
{
    return rtrim((string)(cfg('TOKEN_DIR') ?: sys_get_temp_dir()), '/') . '/afkar-zoho-' . substr(hash('sha256', (string)cfg('ZOHO_CLIENT_ID', '')), 0, 12) . '.json';
}

function zoho_token_cached(): ?string
{
    $raw = is_readable(zoho_token_file()) ? @file_get_contents(zoho_token_file()) : null;
    $t = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($t) && time() < ($t['until'] ?? 0) ? (string)$t['value'] : null;
}

function zoho_token_store(string $v): void
{
    $f = zoho_token_file();
    $tmp = $f . '.' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmp, $v, LOCK_EX) !== false) {
        @chmod($tmp, 0600);
        @rename($tmp, $f);   // atomic, so a parallel request never reads half a file
    } else {
        error_log('[crm] could not cache the Zoho token in ' . dirname($f) . '; every registration will refresh it');
    }
}

function zoho_token(): string
{
    if (($cached = zoho_token_cached()) !== null) return $cached;
    $accounts = (string)cfg('ZOHO_ACCOUNTS', 'https://accounts.zoho.com');
    $q = http_build_query([
        'grant_type' => 'refresh_token',
        'refresh_token' => (string)cfg('ZOHO_REFRESH_TOKEN', ''),
        'client_id' => (string)cfg('ZOHO_CLIENT_ID', ''),
        'client_secret' => (string)cfg('ZOHO_CLIENT_SECRET', ''),
    ]);
    $ch = curl_init("$accounts/oauth/v2/token?$q");
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => '', CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => CRM_TIMEOUT, CURLOPT_CONNECTTIMEOUT => CRM_TIMEOUT]);
    $text = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $data = is_string($text) ? json_decode($text, true) : null;
    if (!is_array($data)) $data = [];
    if ($code < 200 || $code > 299 || empty($data['access_token'])) {
        throw new RuntimeException('Zoho token refresh failed: ' . ($data['error'] ?? $code));
    }
    $until = time() + ((int)($data['expires_in'] ?? 3600) - 120);
    zoho_token_store(json_encode(['value' => $data['access_token'], 'until' => $until]));
    return $data['access_token'];
}

// Zoho DateTime wants yyyy-MM-ddTHH:mm:ss+04:00 (no milliseconds, no Z). UAE has no DST.
function zoho_time(string $iso): string
{
    $t = (new DateTimeImmutable($iso))->setTimezone(new DateTimeZone('+04:00'));
    return $t->format('Y-m-d\TH:i:s') . '+04:00';
}

// Field API names from the CRM team's field list for the Afkar module (3 Nov 2026).
// Extra fields are sent only once they exist in the module: list them in ZOHO_EXTRA_FIELDS,
// e.g. 'Track,Future_Events_Optin'. The subform's own API name is set by ZOHO_MEMBERS_SUBFORM.
function zoho_notes(array $p): ?string
{
    $lines = [];
    foreach (($p['answers'] ?? []) as $q => $a) $lines[] = "$q $a";
    if (($p['note'] ?? '') !== '') $lines[] = "Message from the team: " . $p['note'];
    return $lines ? implode("\n", $lines) : null;
}

function zoho_map_team(array $p): array
{
    $subform = (string)cfg('ZOHO_MEMBERS_SUBFORM', 'Team_Members');
    $extraOn = cfg_list(cfg('ZOHO_EXTRA_FIELDS', ''));
    $labels = ['afkar' => 'Afkar 2026', 'inara' => 'Inara 2026'];
    $members = $p['members'];
    $lead = array_shift($members);
    $rec = [
        'Name' => $p['team'] !== '' ? $p['team'] : $lead['name'],   // solo entries have no team name; Name is mandatory in Zoho
        'Team_Lead_Name' => $lead['name'],
        'Email' => $lead['email'],
        'Team_Lead_Phone' => $lead['phone'],
        'University' => $p['university'],
        'Competition' => $p['eventName'],
        'Event' => $labels[$p['fest']] ?? $p['fest'],
        'Registration_Time' => zoho_time($p['submittedAt']),
        'Guidelines_Accepted' => (bool)$p['guidelines'],
        // the lead is already in the fields above, so the subform holds the other members
        $subform => array_map(fn($m) => ['Member_Name' => $m['name'], 'Member_Email' => $m['email'], 'Member_Phone' => $m['phone']], $members),
    ];
    $extra = [
        'Track' => $p['track'] !== '' ? $p['track'] : null,        // ESCase: Spark or Scoop
        'Future_Events_Optin' => (bool)$p['optin'],
        'Team_Size' => count($p['members']),
        // event questions and the team's message, in one multi-line field
        'Notes' => zoho_notes($p),
    ];
    foreach ($extra as $k => $v) if (in_array($k, $extraOn, true)) $rec[$k] = $v;
    return $rec;
}

// The JSON the CRM team's Afkar function takes (their sample, 4 Nov 2026). The lead is in the
// teamLead* keys and "members" holds everyone else. Event questions arrive keyed by their "crm"
// name in events.js (laptopsRequired, firstChoiceOfFranchise and so on).
function zoho_function_payload(array $p): array
{
    $labels = ['afkar' => 'Afkar 2026', 'inara' => 'Inara 2026'];
    $members = $p['members'];
    $lead = array_shift($members);
    $out = [
        'teamName' => $p['team'] !== '' ? $p['team'] : $lead['name'],
        'university' => $p['university'],
        'teamLeadName' => $lead['name'],
        'teamLeadEmail' => $lead['email'],
        'teamLeadPhone' => $lead['phone'],
        'competition' => $p['eventName'],
        'event' => $labels[$p['fest']] ?? $p['fest'],
        'guidelinesAccepted' => (bool)$p['guidelines'],
        'optInFutureEvents' => (bool)$p['optin'],
        'registrationTime' => zoho_time($p['submittedAt']),
        'teamSize' => (string)count($p['members']),   // Team_Size is a pick list (1 to 6)
    ];
    if (($p['note'] ?? '') !== '') $out['additionalRequirements'] = $p['note'];
    if (($p['track'] ?? '') !== '') $out['track'] = $p['track'];
    foreach (($p['fields'] ?? []) as $k => $v) $out[$k] = $v;
    $out['members'] = array_map(function ($m) {
        // fields a member left empty (optional ones, or ones asked only of the lead) are left out
        $row = [];
        foreach (['name', 'email', 'phone'] as $k) if ($m[$k] !== '') $row[$k] = $m[$k];
        return $row;
    }, $members);
    return $out;
}

// Zoho wraps a function's return value as {"code":"success","details":{"output":"..."}}.
// The Afkar function's output carries the new record under rawCrmResponse.id. A record id means
// the record exists, whatever else the output says (the function's own "success" flag can be wrong);
// no record id plus an error or "success": false means it failed.
function zoho_function_result(array $data): string
{
    if (($data['code'] ?? '') !== 'success') throw new RuntimeException('Zoho function failed: ' . ($data['message'] ?? json_encode($data)));
    $out = $data['details']['output'] ?? '';
    $o = is_string($out) ? json_decode($out, true) : $out;
    if (!is_array($o)) return '';
    $id = $o['rawCrmResponse']['id'] ?? $o['id'] ?? $o['record_id'] ?? $o['recordId'] ?? $o['data'][0]['details']['id'] ?? null;
    if (js_truthy($id)) return js_string($id);
    $status = strtolower((string)($o['status'] ?? $o['code'] ?? ''));
    if (($o['success'] ?? null) === false || in_array($status, ['error', 'failure', 'failed'], true)) {
        throw new RuntimeException('Zoho function returned an error: ' . substr((string)($o['message'] ?? json_encode($o)), 0, 200));
    }
    return '';
}

function zoho_function_url(): string
{
    $url = (string)cfg('ZOHO_FUNCTION_URL', '');
    return str_contains($url, 'auth_type=') ? $url : $url . (str_contains($url, '?') ? '&' : '?') . 'auth_type=oauth';
}

function zoho_url(string $fest): string
{
    $api = (string)cfg('ZOHO_API', 'https://www.zohoapis.com');
    $module = cfg('ZOHO_MODULE_' . strtoupper($fest)) ?: cfg('ZOHO_MODULE');
    return "$api/crm/" . cfg('ZOHO_VERSION', 'v8') . "/$module";
}

// ---------- adapters ----------
final class Crm
{
    public function __construct(public string $mode) {}

    public function pushTeam(array $p): array
    {
        switch ($this->mode) {
            case 'log':
                error_log("[crm:log] team {$p['fest']}/{$p['event']} size=" . count($p['members']) . ' (personal fields not printed)');
                return ['id' => 'dev'];
            case 'webhook':
                $data = crm_request('POST', (string)cfg('CRM_URL'), $this->webhookHeaders(), ['type' => 'registration'] + $p);
                $id = $data['id'] ?? $data['data'][0]['details']['id'] ?? $data['record_id'] ?? null;
                if (!js_truthy($id)) throw new RuntimeException('CRM accepted the request but returned no record id');
                return ['id' => js_string($id)];
            case 'zoho_function':
                $data = crm_request('POST', zoho_function_url(), ['Authorization' => 'Zoho-oauthtoken ' . zoho_token()], zoho_function_payload($p));
                // the function's own reply, so the server log shows what the CRM said (record id or error)
                $id = zoho_function_result($data);
                error_log("[crm:zoho_function] {$p['event']} saved as CRM record " . ($id !== '' ? $id : '(no id in the reply)'));
                return ['id' => $id];
            default: // zoho
                $data = crm_request('POST', zoho_url($p['fest']), ['Authorization' => 'Zoho-oauthtoken ' . zoho_token()], ['data' => [zoho_map_team($p)]]);
                $row = $data['data'][0] ?? null;
                if (!$row || ($row['status'] ?? '') !== 'success') throw new RuntimeException('Zoho rejected the record: ' . ($row['message'] ?? 'unknown'));
                return ['id' => js_string($row['details']['id'])];
        }
    }

    private function webhookHeaders(): array
    {
        $auth = (string)cfg('CRM_AUTH', '');
        return $auth === '' ? [] : [(string)(cfg('CRM_AUTH_HEADER') ?: 'Authorization') => $auth];
    }
}

function crm(): Crm
{
    $mode = (string)(cfg('CRM_MODE') ?: 'log');
    if (!in_array($mode, ['log', 'webhook', 'zoho', 'zoho_function'], true)) throw new RuntimeException("Unknown CRM_MODE \"$mode\" (use log, webhook, zoho or zoho_function)");
    if ($mode === 'zoho_function') {
        foreach (['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_FUNCTION_URL'] as $k) {
            if (!cfg($k)) throw new RuntimeException("CRM_MODE=zoho_function needs $k");
        }
    }
    if ($mode === 'webhook' && !cfg('CRM_URL')) throw new RuntimeException('CRM_MODE=webhook needs CRM_URL');
    if ($mode === 'zoho') {
        foreach (['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'] as $k) {
            if (!cfg($k)) throw new RuntimeException("CRM_MODE=zoho needs $k");
        }
        foreach (cfg_list(cfg('FESTS', 'afkar')) as $f) {
            if (!cfg('ZOHO_MODULE_' . strtoupper($f)) && !cfg('ZOHO_MODULE')) throw new RuntimeException('CRM_MODE=zoho needs ZOHO_MODULE or ZOHO_MODULE_' . strtoupper($f));
        }
    }
    return new Crm($mode);
}
