@extends('flute::layouts.app')

@section('title', 'Battlelog')

@section('content')
    <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 24px 16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div>
                <h1 style="margin: 0 0 6px 0;">Battlelog</h1>
                <div style="opacity:0.8;">
                    Publik sida (ingen inloggning). Data kommer från Node public APIs under <code>/api/battlelog/*</code>.
                </div>
            </div>
            <div style="opacity:0.8;">
                <a href="/arma">Admin</a>
            </div>
        </div>

        <div class="card" style="padding: 16px; border-radius: 12px; margin-top: 16px;">
            <h2 style="margin-top:0;">Overview</h2>
            <pre id="bl-overview" style="white-space: pre-wrap; word-break: break-word; margin: 0; opacity: 0.9;">Loading…</pre>
        </div>

        <div class="card" style="padding: 16px; border-radius: 12px; margin-top: 16px;">
            <h2 style="margin-top:0;">Live activity (latest)</h2>
            <pre id="bl-feed" style="white-space: pre-wrap; word-break: break-word; margin: 0; opacity: 0.9;">Loading…</pre>
        </div>
    </div>

    <script>
        (async function () {
            async function loadJson(url) {
                const res = await fetch(url, { credentials: 'include' });
                const text = await res.text();
                let json;
                try { json = JSON.parse(text); } catch { json = { raw: text, status: res.status }; }
                return { ok: res.ok, status: res.status, json };
            }

            const overviewEl = document.getElementById('bl-overview');
            const feedEl = document.getElementById('bl-feed');

            const ov = await loadJson('/api/battlelog/overview');
            overviewEl.textContent = JSON.stringify(ov.json, null, 2);

            // If endpoint differs, keep it best-effort (avoid breaking page)
            const feed = await loadJson('/api/battlelog/feed');
            feedEl.textContent = JSON.stringify(feed.json, null, 2);
        })();
    </script>
@endsection


