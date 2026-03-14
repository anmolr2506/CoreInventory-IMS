const pool = require("../db");
const { logOperation } = require("../utils/auditLog");

const STOCK_CACHE_TTL_MS = 15000;
const stockCache = new Map();

const sanitizePagination = (value, fallback, maxValue) => {
	const parsed = parseInt(value, 10);
	if (Number.isNaN(parsed) || parsed < 0) {
		return fallback;
	}
	return Math.min(parsed, maxValue);
};

const getUserContext = async (userId) => {
	const userResult = await pool.query(
		"SELECT role FROM users WHERE user_id = $1 AND is_active = true",
		[userId]
	);

	if (userResult.rows.length === 0) {
		return null;
	}

	const role = userResult.rows[0].role;

	if (role === "admin" || role === "manager") {
		return { role, warehouseIds: [] };
	}

	const warehouseResult = await pool.query(
		"SELECT warehouse_id FROM warehouse_assignments WHERE user_id = $1",
		[userId]
	);

	return {
		role,
		warehouseIds: warehouseResult.rows.map((row) => row.warehouse_id)
	};
};

const buildCacheKey = ({ userId, role, warehouseIds, search, limit, offset }) => {
	return [
		userId,
		role,
		warehouseIds.join(","),
		search || "",
		limit,
		offset
	].join("|");
};

const clearStockCache = () => {
	stockCache.clear();
};

const getStockInventory = async (req, res) => {
	try {
		const userId = req.user?.id ?? req.user;
		if (!userId) {
			return res.status(401).json("Unauthorized");
		}

		const userContext = await getUserContext(userId);
		if (!userContext) {
			return res.status(401).json("Unauthorized");
		}

		const search = (req.query.search || "").trim();
		const limit = sanitizePagination(req.query.limit, 50, 200);
		const offset = sanitizePagination(req.query.offset, 0, 100000);

		const cacheKey = buildCacheKey({
			userId,
			role: userContext.role,
			warehouseIds: userContext.warehouseIds,
			search,
			limit,
			offset
		});

		const cachedEntry = stockCache.get(cacheKey);
		if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
			return res.json(cachedEntry.data);
		}

		const whereClauses = [];
		const params = [];

		if (search) {
			params.push(`%${search}%`);
			whereClauses.push(`p.name ILIKE $${params.length}`);
		}

		if (userContext.role === "staff") {
			if (userContext.warehouseIds.length === 0) {
				return res.json({ rows: [], canEdit: false, total: 0 });
			}
			params.push(userContext.warehouseIds);
			whereClauses.push(`i.warehouse_id = ANY($${params.length}::int[])`);
		}

		const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

		params.push(limit);
		const limitIndex = params.length;
		params.push(offset);
		const offsetIndex = params.length;

		const result = await pool.query(
			`
			SELECT
				i.inventory_id,
				p.product_id,
				p.name AS product,
				w.warehouse_id,
				w.name AS warehouse,
				COALESCE(sp.price, 0) AS per_unit_cost,
				i.quantity AS on_hand,
				GREATEST(i.quantity - i.reserved_quantity, 0) AS free_to_use,
				COUNT(*) OVER() AS total_count
			FROM inventory i
			JOIN products p ON p.product_id = i.product_id
			JOIN warehouses w ON w.warehouse_id = i.warehouse_id
			LEFT JOIN LATERAL (
				SELECT price
				FROM supplier_products
				WHERE product_id = p.product_id
				ORDER BY lead_time_days ASC NULLS LAST, supplier_id ASC
				LIMIT 1
			) sp ON true
			${whereSql}
			ORDER BY p.name ASC, w.name ASC
			LIMIT $${limitIndex}
			OFFSET $${offsetIndex}
			`,
			params
		);

		const responsePayload = {
			canEdit: userContext.role === "admin" || userContext.role === "manager",
			total: result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0,
			rows: result.rows.map((row) => ({
				inventory_id: row.inventory_id,
				product_id: row.product_id,
				product: row.product,
				warehouse_id: row.warehouse_id,
				warehouse: row.warehouse,
				per_unit_cost: Number(row.per_unit_cost),
				on_hand: Number(row.on_hand),
				free_to_use: Number(row.free_to_use)
			}))
		};

		stockCache.set(cacheKey, {
			data: responsePayload,
			expiresAt: Date.now() + STOCK_CACHE_TTL_MS
		});

		return res.json(responsePayload);
	} catch (err) {
		console.error("Error fetching stock inventory:", err.message);
		return res.status(500).json("Server Error");
	}
};

const updateStockInventory = async (req, res) => {
	const client = await pool.connect();
	try {
		const userId = req.user?.id ?? req.user;
		if (!userId) {
			return res.status(401).json("Unauthorized");
		}

		const userContext = await getUserContext(userId);
		if (!userContext) {
			return res.status(401).json("Unauthorized");
		}

		if (userContext.role !== "admin" && userContext.role !== "manager") {
			return res.status(403).json("Forbidden: Only managers or admins can update stock");
		}

		const inventoryId = parseInt(req.params.inventory_id, 10);
		const onHand = parseInt(req.body.on_hand, 10);
		const freeToUse = parseInt(req.body.free_to_use, 10);

		if (Number.isNaN(inventoryId) || inventoryId <= 0) {
			return res.status(400).json("Invalid inventory_id");
		}

		if (Number.isNaN(onHand) || Number.isNaN(freeToUse) || onHand < 0 || freeToUse < 0) {
			return res.status(400).json("on_hand and free_to_use must be non-negative integers");
		}

		if (freeToUse > onHand) {
			return res.status(400).json("free_to_use cannot be greater than on_hand");
		}

		await client.query("BEGIN");

		const currentResult = await client.query(
			`
			SELECT inventory_id, product_id, warehouse_id, quantity
			FROM inventory
			WHERE inventory_id = $1
			FOR UPDATE
			`,
			[inventoryId]
		);

		if (currentResult.rows.length === 0) {
			await client.query("ROLLBACK");
			return res.status(404).json("Inventory row not found");
		}

		const currentRow = currentResult.rows[0];
		const reservedQuantity = onHand - freeToUse;
		const adjustment = onHand - Number(currentRow.quantity);

		const updateResult = await client.query(
			`
			UPDATE inventory
			SET quantity = $1,
				reserved_quantity = $2,
				last_updated = NOW()
			WHERE inventory_id = $3
			RETURNING inventory_id, product_id, warehouse_id, quantity, reserved_quantity, last_updated
			`,
			[onHand, reservedQuantity, inventoryId]
		);

		await client.query(
			`
			INSERT INTO stock_adjustments (product_id, warehouse_id, adjustment, reason, adjusted_by)
			VALUES ($1, $2, $3, $4, $5)
			`,
			[
				currentRow.product_id,
				currentRow.warehouse_id,
				adjustment,
				"Inline stock edit",
				userId
			]
		);

		await client.query("COMMIT");

		await logOperation(
			userId,
			"ADJUSTMENT",
			{
				product_id: currentRow.product_id,
				warehouse_id: currentRow.warehouse_id,
				quantity: adjustment
			},
			updateResult.rows[0].inventory_id
		);

		clearStockCache();

		return res.json({
			message: "Stock updated successfully",
			stock: {
				inventory_id: updateResult.rows[0].inventory_id,
				product_id: updateResult.rows[0].product_id,
				warehouse_id: updateResult.rows[0].warehouse_id,
				on_hand: Number(updateResult.rows[0].quantity),
				free_to_use: Number(updateResult.rows[0].quantity) - Number(updateResult.rows[0].reserved_quantity),
				last_updated: updateResult.rows[0].last_updated
			}
		});
	} catch (err) {
		await client.query("ROLLBACK");
		console.error("Error updating stock inventory:", err.message);
		return res.status(500).json("Server Error");
	} finally {
		client.release();
	}
};

module.exports = {
	getStockInventory,
	updateStockInventory,
	clearStockCache
};
