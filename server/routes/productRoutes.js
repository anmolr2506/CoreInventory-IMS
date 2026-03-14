const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const requireApprovedUser = require("../middleware/requireApprovedUser");
const { checkRole } = require("../middleware/roleAuthorization");
const {
	getProductCategories,
	getProductsWithLocation,
	createProduct,
	updateProduct
} = require("../controllers/productController");

router.use(authorizeToken, requireApprovedUser);

router.get("/products", getProductsWithLocation);
router.get("/products/categories", getProductCategories);
router.post("/products", checkRole(["manager", "admin"]), createProduct);
router.put("/products/:product_id", checkRole(["manager", "admin"]), updateProduct);

module.exports = router;
