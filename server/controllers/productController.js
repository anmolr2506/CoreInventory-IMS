const pool = require("../db");
const { clearStockCache } = require("./inventoryController");

const getProductCategories = async (_req, res) => {
	try {
		const result = await pool.query(
			"SELECT category_id, name FROM categories ORDER BY name ASC"
		);
		return res.json(result.rows);
	} catch (err) {
		console.error("Error fetching categories:", err.message);
		return res.status(500).json("Server Error");
	}
};

const getProductsWithLocation = async (req, res) => {
	try {
		const search = (req.query.search || "").trim();
		const params = [];
		let whereSql = "";

		if (search) {
			params.push(`%${search}%`);
			whereSql = "WHERE p.name ILIKE $1 OR p.sku ILIKE $1";
		}

		const result = await pool.query(
			`
			SELECT
				p.product_id,
				p.name,
				p.sku,
				p.unit,
				p.reorder_level,
				c.category_id,
				c.name AS category,
				i.inventory_id,
				w.warehouse_id,
				w.name AS warehouse,
				i.quantity AS on_hand,
				GREATEST(i.quantity - i.reserved_quantity, 0) AS free_to_use
			FROM products p
			JOIN categories c ON c.category_id = p.category_id
			LEFT JOIN inventory i ON i.product_id = p.product_id
			LEFT JOIN warehouses w ON w.warehouse_id = i.warehouse_id
			${whereSql}
			ORDER BY p.name ASC, w.name ASC NULLS LAST
			`,
			params
		);

		return res.json(result.rows);
	} catch (err) {
		console.error("Error fetching products:", err.message);
		return res.status(500).json("Server Error");
	}
};

const resolveCategoryId = async (client, categoryId, categoryName) => {
	if (categoryId) {
		const existing = await client.query(
			"SELECT category_id FROM categories WHERE category_id = $1",
			[categoryId]
		);
		if (existing.rows.length === 0) {
			return null;
		}
		return existing.rows[0].category_id;
	}

	if (!categoryName || !categoryName.trim()) {
		return null;
	}

	const normalized = categoryName.trim();
	const created = await client.query(
		`
		INSERT INTO categories (name)
		VALUES ($1)
		ON CONFLICT (name)
		DO UPDATE SET name = EXCLUDED.name
		RETURNING category_id
		`,
		[normalized]
	);

	return created.rows[0].category_id;
};

const createProduct = async (req, res) => {
	const client = await pool.connect();
	try {
		const {
			name,
			sku,
			unit,
			reorder_level = 0,
			category_id,
			category_name,
			initial_stock,
			warehouse_id
		} = req.body;

		if (!name || !sku || !unit) {
			return res.status(400).json("name, sku, and unit are required");
		}

		const reorderLevel = parseInt(reorder_level, 10);
		if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
			return res.status(400).json("reorder_level must be a non-negative integer");
		}

		const initialStock = initial_stock === undefined || initial_stock === ""
			? 0
			: parseInt(initial_stock, 10);

		if (Number.isNaN(initialStock) || initialStock < 0) {
			return res.status(400).json("initial_stock must be a non-negative integer");
		}

		await client.query("BEGIN");

		const resolvedCategoryId = await resolveCategoryId(client, category_id, category_name);
		if (!resolvedCategoryId) {
			await client.query("ROLLBACK");
			return res.status(400).json("Valid category_id or category_name is required");
		}

		const productResult = await client.query(
			`
			INSERT INTO products (name, sku, category_id, unit, reorder_level)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING product_id, name, sku, category_id, unit, reorder_level
			`,
			[name.trim(), sku.trim(), resolvedCategoryId, unit.trim(), reorderLevel]
		);

		const product = productResult.rows[0];

		if (initialStock > 0) {
			const warehouseId = parseInt(warehouse_id, 10);
			if (Number.isNaN(warehouseId) || warehouseId <= 0) {
				await client.query("ROLLBACK");
				return res.status(400).json("warehouse_id is required when initial_stock is provided");
			}

			await client.query(
				`
				INSERT INTO inventory (product_id, warehouse_id, quantity, reserved_quantity)
				VALUES ($1, $2, $3, 0)
				ON CONFLICT (product_id, warehouse_id)
				DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity
				`,
				[product.product_id, warehouseId, initialStock]
			);
		}

		await client.query("COMMIT");
		clearStockCache();

		return res.status(201).json({ message: "Product created", product });
	} catch (err) {
		await client.query("ROLLBACK");
		if (err.code === "23505") {
			return res.status(409).json("SKU already exists");
		}
		console.error("Error creating product:", err.message);
		return res.status(500).json("Server Error");
	} finally {
		client.release();
	}
};

const updateProduct = async (req, res) => {
	const client = await pool.connect();
	try {
		const productId = parseInt(req.params.product_id, 10);
		if (Number.isNaN(productId) || productId <= 0) {
			return res.status(400).json("Invalid product_id");
		}

		const {
			name,
			sku,
			unit,
			reorder_level,
			category_id,
			category_name
		} = req.body;

		await client.query("BEGIN");

		const existing = await client.query(
			"SELECT product_id FROM products WHERE product_id = $1",
			[productId]
		);

		if (existing.rows.length === 0) {
			await client.query("ROLLBACK");
			return res.status(404).json("Product not found");
		}

		const updates = [];
		const params = [];

		if (name !== undefined) {
			params.push(name.trim());
			updates.push(`name = $${params.length}`);
		}
		if (sku !== undefined) {
			params.push(sku.trim());
			updates.push(`sku = $${params.length}`);
		}
		if (unit !== undefined) {
			params.push(unit.trim());
			updates.push(`unit = $${params.length}`);
		}
		if (reorder_level !== undefined) {
			const reorderLevel = parseInt(reorder_level, 10);
			if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
				await client.query("ROLLBACK");
				return res.status(400).json("reorder_level must be a non-negative integer");
			}
			params.push(reorderLevel);
			updates.push(`reorder_level = $${params.length}`);
		}

		if (category_id !== undefined || category_name !== undefined) {
			const resolvedCategoryId = await resolveCategoryId(client, category_id, category_name);
			if (!resolvedCategoryId) {
				await client.query("ROLLBACK");
				return res.status(400).json("Invalid category");
			}
			params.push(resolvedCategoryId);
			updates.push(`category_id = $${params.length}`);
		}

		if (updates.length === 0) {
			await client.query("ROLLBACK");
			return res.status(400).json("No fields provided to update");
		}

		params.push(productId);
		const result = await client.query(
			`
			UPDATE products
			SET ${updates.join(", ")}
			WHERE product_id = $${params.length}
			RETURNING product_id, name, sku, category_id, unit, reorder_level
			`,
			params
		);

		await client.query("COMMIT");
		clearStockCache();

		return res.json({ message: "Product updated", product: result.rows[0] });
	} catch (err) {
		await client.query("ROLLBACK");
		if (err.code === "23505") {
			return res.status(409).json("SKU already exists");
		}
		console.error("Error updating product:", err.message);
		return res.status(500).json("Server Error");
	} finally {
		client.release();
	}
};

module.exports = {
	getProductCategories,
	getProductsWithLocation,
	createProduct,
	updateProduct
};
