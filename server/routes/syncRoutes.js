const router = require("express").Router();
const { receiveEvents } = require("../controllers/syncController");

// No JWT auth here; uses shared secret header x-sync-secret.
router.post("/sync/events", receiveEvents);

module.exports = router;

