const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleAuthorization");
const {
	getProductCategories,
	getProductsWithLocation,
	createProduct,
	updateProduct
} = require("../controllers/productController");

router.get("/products", authorizeToken, getProductsWithLocation);
router.get("/products/categories", authorizeToken, getProductCategories);
router.post("/products", authorizeToken, checkRole(["manager", "admin"]), createProduct);
router.put("/products/:product_id", authorizeToken, checkRole(["manager", "admin"]), updateProduct);

module.exports = router;
