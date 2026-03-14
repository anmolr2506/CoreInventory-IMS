require("dotenv").config({ path: "../.env" });
const pool = require("../db");

async function postJson(url, body, secret) {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-sync-secret": secret
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Sync POST failed ${res.status}: ${text}`);
    }
    return await res.json();
}

function getPeerUrls() {
    const raw = process.env.SYNC_PEERS || "";
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((base) => base.replace(/\/+$/, "") + "/sync/events");
}

async function flushOnce() {
    const peers = getPeerUrls();
    const secret = process.env.SYNC_SECRET;
    if (!secret || peers.length === 0) return;

    const result = await pool.query(
        `SELECT event_id, source_site_id, event_type, payload
         FROM outbox_events
         WHERE sent_at IS NULL
         ORDER BY created_at ASC
         LIMIT 100`
    );

    if (result.rows.length === 0) return;

    const events = result.rows.map((r) => ({
        event_id: r.event_id,
        source_site_id: r.source_site_id,
        event_type: r.event_type,
        payload: r.payload
    }));

    for (const peerUrl of peers) {
        await postJson(peerUrl, { events }, secret);
    }

    const ids = result.rows.map((r) => r.event_id);
    await pool.query(
        `UPDATE outbox_events SET sent_at = NOW() WHERE event_id = ANY($1::uuid[])`,
        [ids]
    );
}

async function main() {
    const intervalMs = Number.parseInt(process.env.SYNC_INTERVAL_MS || "5000", 10);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            await flushOnce();
        } catch (err) {
            console.error("[sync-worker] error:", err.message);
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
}

main().catch((err) => {
    console.error("[sync-worker] fatal:", err.message);
    process.exit(1);
});

