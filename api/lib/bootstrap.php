<?php
// Shared helpers for the registration API: settings, input checks, responses, the event list.
//
// Nothing is stored on this server. A registration is checked against the rules in
// assets/events.js and sent straight to the CRM, which is the only record.

declare(strict_types=1);

ini_set('display_errors', '0');
mb_internal_encoding('UTF-8');

class Bad extends Exception
{
    public int $status;
    public function __construct(string $message, int $status = 400)
    {
        parent::__construct($message);
        $this->status = $status;
    }
}

// ---------- config ----------
// Settings come from config.php (copy config.example.php). A setting can also be given as an
// environment variable named FEST_<SETTING>, which wins over the file.
function cfg(string $key, $default = null)
{
    static $file = null;
    if ($file === null) {
        $path = __DIR__ . '/../config.php';
        if (!is_file($path)) $path = __DIR__ . '/../config.example.php';
        $file = require $path;
    }
    $env = getenv('FEST_' . $key);
    if ($env !== false && $env !== '') return $env;
    return $file[$key] ?? $default;
}

function cfg_list($v): array
{
    if (is_string($v)) $v = explode(',', $v);
    return array_values(array_filter(array_map('trim', (array)$v), fn($s) => $s !== ''));
}

// ---------- JS-like helpers, so input is treated the same as the Node version did ----------
function js_string($v): string
{
    if ($v === null) return '';
    if (is_bool($v)) return $v ? 'true' : 'false';
    if (is_int($v) || is_float($v)) return (string)$v;
    if (is_string($v)) return $v;
    if (is_array($v)) return array_is_list($v) ? implode(',', array_map('js_string', $v)) : '[object Object]';
    return '';
}

function js_truthy($v): bool
{
    if ($v === null || $v === false || $v === '' || $v === 0 || $v === 0.0) return false;
    return true; // "0" and any array are truthy in JavaScript
}

function clean($s, int $n): string
{
    $s = preg_replace('/(*UCP)[\s\x{FEFF}]+/u', ' ', js_string($s)) ?? '';
    return mb_substr(trim($s, ' '), 0, $n);
}

function lower(string $s): string { return mb_strtolower($s); }

function now_iso(): string { return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z'); }

const EMAIL_RE = '/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/D';
const PHONE_RE = '/^\+[1-9]\d{6,14}$/D'; // E.164: country code + 6 to 12 digits
const ID_RE = '/^[\w.-]{8,64}$/D';

// ---------- responses ----------
function send($status, $body, string $type = 'application/json; charset=utf-8', array $extra = []): void
{
    http_response_code($status);
    header('Content-Type: ' . $type);
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    foreach ($extra as $k => $v) header("$k: $v");
    echo is_string($body) ? $body : json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// Runs a route: Bad becomes its status, anything else a plain 500 (details go to the server log).
function run(string $method, callable $fn): void
{
    try {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
            send(404, ['error' => 'Not found']);
            return;
        }
        $fn();
    } catch (Bad $e) {
        send($e->status, ['error' => $e->getMessage()]);
    } catch (Throwable $e) {
        error_log('[error] ' . ($_SERVER['REQUEST_URI'] ?? '') . ': ' . $e);
        if (!headers_sent()) send(500, ['error' => 'Something went wrong on our side']);
    }
}

function read_json(int $limit = 32768): array
{
    $type = (string)($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
    if (!str_starts_with($type, 'application/json')) throw new Bad('Send JSON', 415);
    $raw = (string)file_get_contents('php://input', false, null, 0, $limit + 1);
    if (strlen($raw) > $limit) throw new Bad('Too large', 413);
    if (trim($raw) === '') return [];
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) throw new Bad('Bad JSON');
    return is_array($data) && !array_is_list($data) ? $data : [];
}

// ---------- event lists: read straight from each site's assets/events.js ----------
function load_fest(string $fest): ?array
{
    $files = cfg('EVENTS_FILES', []);
    $file = is_array($files) && isset($files[$fest])
        ? $files[$fest]
        : (string)cfg('SITES_DIR', dirname(__DIR__, 3)) . "/$fest/assets/events.js";
    if (!is_file($file)) return null;
    $src = (string)file_get_contents($file);
    // the file is `window.INARA = { ...json... };`
    if (!preg_match('/window\.\w+\s*=\s*/', $src, $m, PREG_OFFSET_CAPTURE)) return null;
    $start = strpos($src, '{', $m[0][1]);
    $end = strrpos($src, '}');
    if ($start === false || $end === false) return null;
    $data = json_decode(substr($src, $start, $end - $start + 1), true);
    if (!is_array($data)) return null;
    $events = [];
    foreach ($data['events'] ?? [] as $e) $events[$e['slug']] = $e;
    return ['fest' => $fest, 'events' => $events];
}

function fest_for(array $body): array
{
    $host = lower(explode(':', (string)($_SERVER['HTTP_HOST'] ?? ''))[0]);
    $map = cfg('HOST_MAP', []);
    $f = (is_array($map) && !empty($map[$host])) ? (string)$map[$host] : clean($body['fest'] ?? null, 20);
    if (!in_array($f, cfg_list(cfg('FESTS', 'inara')), true)) throw new Bad('Unknown fest');
    $d = load_fest($f);
    if (!$d) throw new Bad('Unknown fest');
    return $d;
}

require_once __DIR__ . '/crm.php';
