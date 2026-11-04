<?php
// POST /api/register.php: register a team. Same rules as the form in assets/app.js.
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

function member_field(array $ev, string $k): string
{
    $v = $ev['memberFields'][$k] ?? null;
    if (in_array($v, ['required', 'optional', 'lead'], true)) return $v;
    return $k === 'phone' && ($ev['phones'] ?? '') === 'lead' ? 'lead' : 'required';
}

function validate_registration(array $fd, array $body): array
{
    if (js_truthy($body['website'] ?? null)) throw new Bad('Registration failed'); // honeypot: people never fill it, bots do
    $ev = $fd['events'][clean($body['event'] ?? null, 64)] ?? null;
    if (!$ev || !js_truthy($ev['open'] ?? null) || js_truthy($ev['placeholder'] ?? null)) throw new Bad("This event isn't open for registration");
    // Events with tracks (ESCase): the team picks one, and the track sets the team size.
    $track = null;
    if (js_truthy($ev['tracks'] ?? null)) {
        $want = clean($body['track'] ?? null, 40);
        foreach ($ev['tracks'] as $t) if (($t['name'] ?? null) === $want) { $track = $t; break; }
        if (!$track) throw new Bad('Choose a track');
    }
    [$lo, $hi] = ($track['team'] ?? $ev['team'] ?? null) ?: [1, 1];
    // The event's own questions. Types: "choice" (default) and "select" pick one of the options,
    // "text" is a short answer. Required unless "required": false. Questions sharing a "group"
    // (like 1st/2nd/3rd franchise choice) must all have different answers.
    $answers = [];
    $fields = [];   // answers keyed by their CRM field ("crm" on the question); "crmBool" sends true
    $groups = [];
    $given = is_array($body['answers'] ?? null) ? $body['answers'] : [];
    foreach (($ev['questions'] ?? []) as $q) {
        $type = $q['type'] ?? 'choice';
        $val = clean($given[$q['id']] ?? null, $type === 'text' ? 200 : 80);
        $required = ($q['required'] ?? true) !== false;
        if ($val === '') {
            if ($required) throw new Bad('Answer: ' . $q['label']);
            continue;
        }
        if ($type !== 'text' && !in_array($val, $q['options'] ?? [], true)) throw new Bad('Answer: ' . $q['label']);
        if (isset($q['group'])) {
            if (in_array($val, $groups[$q['group']] ?? [], true)) throw new Bad('Choose a different answer for: ' . $q['label']);
            $groups[$q['group']][] = $val;
        }
        $answers[$q['label']] = $val;
        if (isset($q['crm'])) $fields[$q['crm']] = js_truthy($q['crmBool'] ?? null) ? true : $val;
    }
    // Optional free-text message; line breaks kept, control characters dropped.
    $note = preg_replace('/[^\P{C}\n]+/u', '', (string)js_string($body['note'] ?? '')) ?? '';
    $note = mb_substr(trim($note), 0, 1000);
    $solo = $hi === 1;
    $team = $solo ? '' : clean($body['team'] ?? null, 40);
    $university = clean($body['university'] ?? null, 120);
    if (!$solo && $team === '') throw new Bad('Enter a team name');
    if ($university === '') throw new Bad('Choose your university');
    $raw = (isset($body['members']) && is_array($body['members']) && array_is_list($body['members'])) ? $body['members'] : [];
    if (count($raw) < $lo || count($raw) > $hi) throw new Bad($solo ? 'Enter your details' : "{$ev['name']} teams have $lo to $hi members");
    $members = [];
    foreach ($raw as $i => $m) {
        $m = is_array($m) ? $m : [];
        $who = $solo ? 'your' : ($i === 0 ? "the team lead's" : 'member ' . ($i + 1) . "'s");
        $name = clean($m['name'] ?? null, 120);
        $email = lower(clean($m['email'] ?? null, 254));
        $phone = clean($m['phone'] ?? null, 16);
        // Members other than the lead may leave a field empty when events.js marks it "optional" or "lead"
        // ("memberFields"; the older "phones": "lead" still works). Anything filled in is still checked.
        $mayBeEmpty = fn(string $k) => $i > 0 && member_field($ev, $k) !== 'required';
        if (!($mayBeEmpty('name') && $name === '') && mb_strlen($name) < 2) throw new Bad("Enter $who full name");
        if (!($mayBeEmpty('email') && $email === '') && !preg_match(EMAIL_RE, $email)) throw new Bad("Enter $who email");
        if (!($mayBeEmpty('phone') && $phone === '') && !preg_match(PHONE_RE, $phone)) throw new Bad("Enter $who WhatsApp number");
        $members[] = ['position' => $i, 'lead' => $i === 0, 'name' => $name, 'email' => $email, 'phone' => $phone];
    }
    if (!js_truthy($body['agree'] ?? null)) throw new Bad('Confirm your team has read the guidelines');
    $id = clean($body['id'] ?? null, 64);
    if (!preg_match(ID_RE, $id)) throw new Bad('Registration failed, reload the page and try again');
    return [
        'ev' => $ev, 'track' => $track['name'] ?? '', 'id' => $id, 'team' => $team, 'university' => $university,
        'listed' => js_truthy($body['universityListed'] ?? null) ? 1 : 0, 'members' => $members,
        'optin' => js_truthy($body['optin'] ?? null), 'guidelines' => js_truthy($body['agree'] ?? null),
        'answers' => $answers, 'fields' => $fields, 'note' => $note,
    ];
}

run('POST', function () {
    ignore_user_abort(true); // finish sending to the CRM even if the browser leaves
    set_time_limit(60);
    $body = read_json();
    $fd = fest_for($body);
    $v = validate_registration($fd, $body);
    $slug = $v['ev']['slug'];
    // Personal data goes to the CRM only; nothing is kept here. If the CRM fails, the team is asked to try again.
    try {
        crm()->pushTeam([
            'fest' => $fd['fest'], 'event' => $slug, 'eventName' => $v['ev']['name'],
            'track' => $v['track'], 'team' => $v['team'], 'university' => $v['university'],
            'universityListed' => (bool)$v['listed'], 'submittedAt' => now_iso(), 'optin' => $v['optin'],
            'guidelines' => $v['guidelines'], 'answers' => $v['answers'], 'fields' => $v['fields'], 'note' => $v['note'], 'members' => $v['members'],
        ]);
    } catch (Throwable $e) {
        error_log("[register] CRM push failed for {$fd['fest']}/$slug: " . $e->getMessage());
        throw new Bad('The registration service is busy, try again in a minute', 503);
    }
    error_log("[register] {$fd['fest']}/$slug registered");
    send(201, ['ok' => true, 'status' => 'registered']);
});
