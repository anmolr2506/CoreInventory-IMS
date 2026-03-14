const pool = require("../db");
const crypto = require("crypto");

function getSiteId() {
    return process.env.SITE_ID || "default-site";
}

async function enqueueEvent(eventType, payload) {
    const eventId = crypto.randomUUID();
    const sourceSiteId = getSiteId();
    await pool.query(
        `INSERT INTO outbox_events (event_id, source_site_id, event_type, payload)
         VALUES ($1, $2, $3, $4)`,
        [eventId, sourceSiteId, eventType, payload]
    );
    return { event_id: eventId, source_site_id: sourceSiteId };
}

module.exports = {
    enqueueEvent,
    getSiteId
};

