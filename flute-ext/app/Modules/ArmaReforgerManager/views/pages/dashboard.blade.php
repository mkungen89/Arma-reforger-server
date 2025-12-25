@extends('flute::layouts.app')

@section('title', 'Arma Reforger Manager')

@section('content')
    <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 24px 16px;">
        <h1 style="margin: 0 0 8px 0;">Arma Reforger Manager</h1>
        <p style="margin: 0 0 18px 0; opacity: 0.8;">
            This page is rendered by Flute, and reads data from the Node API under <code>/api</code>.
        </p>

        <div class="card" style="padding: 16px; border-radius: 12px;">
            <h2 style="margin-top: 0;">Server Status</h2>
            <pre id="arma-status" style="white-space: pre-wrap; word-break: break-word; margin: 0; opacity: 0.9;">Loading…</pre>
        </div>

        <div class="card" style="padding: 16px; border-radius: 12px; margin-top: 16px;">
            <h2 style="margin-top: 0;">Battlelog Overview</h2>
            <pre id="arma-battlelog" style="white-space: pre-wrap; word-break: break-word; margin: 0; opacity: 0.9;">Loading…</pre>
        </div>
    </div>

    <script>
        (async function () {
            async function loadJson(url) {
                const res = await fetch(url, { credentials: 'include' });
                const text = await res.text();
                try { return JSON.parse(text); } catch { return { raw: text, status: res.status }; }
            }

            try {
                const status = await loadJson('/api/status');
                document.getElementById('arma-status').textContent = JSON.stringify(status, null, 2);
            } catch (e) {
                document.getElementById('arma-status').textContent = 'Failed to load /api/status: ' + (e && e.message ? e.message : String(e));
            }

            try {
                const overview = await loadJson('/api/battlelog/overview');
                document.getElementById('arma-battlelog').textContent = JSON.stringify(overview, null, 2);
            } catch (e) {
                document.getElementById('arma-battlelog').textContent = 'Failed to load /api/battlelog/overview: ' + (e && e.message ? e.message : String(e));
            }
        })();
    </script>
@endsection


