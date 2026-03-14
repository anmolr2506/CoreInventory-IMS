const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const requireApprovedUser = require("../middleware/requireApprovedUser");
const { checkRole } = require("../middleware/roleAuthorization");
const locationController = require("../controllers/locationController");

/**
 * Location Routes
 * Locations represent specific areas within a warehouse (rooms, zones, shelves)
 * Only admins and managers can CRUD locations
 */

// Get all locations (with optional warehouse filter)
router.get("/locations", authorizeToken, requireApprovedUser, locationController.getAllLocations);

// Get location by ID
router.get("/location/:location_id", authorizeToken, requireApprovedUser, locationController.getLocation);

// Create location (admin/manager only)
router.post("/location", authorizeToken, requireApprovedUser, checkRole(['admin', 'manager']), locationController.createLocation);

// Update location (admin/manager only)
router.put("/location/:location_id", authorizeToken, requireApprovedUser, checkRole(['admin', 'manager']), locationController.updateLocation);

// Delete location (admin only)
router.delete("/location/:location_id", authorizeToken, requireApprovedUser, checkRole('admin'), locationController.deleteLocation);

module.exports = router;
