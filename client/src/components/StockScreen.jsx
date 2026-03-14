import React, { useEffect, useMemo, useState } from 'react';
import { Search, User, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';

const NAV_TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'operations', label: 'Operations' },
    { id: 'stock', label: 'Products' },
    { id: 'move-history', label: 'Move History' },
    { id: 'settings', label: 'Settings' }
];

const StockScreen = ({ username, role, onLogout, onNavigate }) => {
    const [rows, setRows] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [stockSearch, setStockSearch] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('all');
    const [showWarehouseFilter, setShowWarehouseFilter] = useState(false);
    const [warehouseOptions, setWarehouseOptions] = useState([]);
    const [productSaving, setProductSaving] = useState(false);
    const [editingProductId, setEditingProductId] = useState(null);
    const [productForm, setProductForm] = useState({
        name: '',
        sku: '',
        unit: '',
        category_id: '',
        category_name: '',
        reorder_level: 0,
        initial_stock: '',
        warehouse_id: 1
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [draftById, setDraftById] = useState({});
    const [editingCell, setEditingCell] = useState(null);
    const [savingId, setSavingId] = useState(null);

    const token = localStorage.getItem('token');
    const canEdit = role === 'admin' || role === 'manager';

    const resetProductForm = () => {
        setEditingProductId(null);
        setProductForm({
            name: '',
            sku: '',
            unit: '',
            category_id: '',
            category_name: '',
            reorder_level: 0,
            initial_stock: '',
            warehouse_id: 1
        });
    };

    const loadProducts = async (query = '') => {
        try {
            const params = new URLSearchParams();
            if (query.trim()) {
                params.set('search', query.trim());
            }

            const response = await fetch(`http://localhost:5000/products?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                let message = await response.text();
                if (response.status === 401 || response.status === 403) {
                    message = 'Not authorized to access products.';
                }
                throw new Error(message || 'Failed to load products');
            }

            const data = await response.json();
            setProducts(data);
        } catch (err) {
            toast.error(err.message || 'Failed to load products');
        }
    };

    const loadCategories = async () => {
        try {
            const response = await fetch('http://localhost:5000/products/categories', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load categories');
            }

            const data = await response.json();
            setCategories(data);
        } catch (err) {
            toast.error(err.message || 'Failed to load categories');
        }
    };

    const loadStock = async (query = '', warehouseId = 'all') => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (query.trim()) {
                params.set('search', query.trim());
            }
            if (warehouseId !== 'all') {
                params.set('warehouse_id', warehouseId);
            }
            const response = await fetch(`http://localhost:5000/inventory/stock?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                let message = await response.text();
                if (response.status === 401 || response.status === 403) {
                    message = 'Not authorized to access stock. Please log in again.';
                }
                throw new Error(message || 'Failed to load stock');
            }

            const data = await response.json();
            setRows(data.rows || []);
            setWarehouseOptions((prev) => {
                const next = new Map(prev.map((item) => [item.id, item.name]));
                (data.rows || []).forEach((row) => {
                    if (row.warehouse_id) {
                        next.set(String(row.warehouse_id), row.warehouse);
                    }
                });
                return Array.from(next.entries()).map(([id, name]) => ({ id, name }));
            });
        } catch (err) {
            toast.error(err.message || 'Failed to load stock data');
            setError(err.message || 'Failed to load stock data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProducts(productSearch);
        }, 250);

        return () => clearTimeout(timer);
    }, [productSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadStock(stockSearch, selectedWarehouseId);
        }, 250);

        return () => clearTimeout(timer);
    }, [stockSearch, selectedWarehouseId]);

    useEffect(() => {
        loadCategories();
    }, []);

    const submitProduct = async (event) => {
        event.preventDefault();

        if (!canEdit) {
            toast.error('Only manager/admin can create or update products');
            return;
        }

        const payload = {
            name: productForm.name,
            sku: productForm.sku,
            unit: productForm.unit,
            reorder_level: Number(productForm.reorder_level),
            category_id: productForm.category_id ? Number(productForm.category_id) : undefined,
            category_name: productForm.category_name || undefined,
            initial_stock: productForm.initial_stock === '' ? undefined : Number(productForm.initial_stock),
            warehouse_id: Number(productForm.warehouse_id)
        };

        if (!payload.name || !payload.sku || !payload.unit) {
            toast.error('Name, SKU/Code, and Unit of Measure are required');
            return;
        }

        setProductSaving(true);
        try {
            const endpoint = editingProductId
                ? `http://localhost:5000/products/${editingProductId}`
                : 'http://localhost:5000/products';

            const method = editingProductId ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let message = await response.text();
                if (response.status === 401 || response.status === 403) {
                    message = 'Not authorized to modify products.';
                }
                throw new Error(message || 'Failed to save product');
            }

            toast.success(editingProductId ? 'Product updated' : 'Product created');
            resetProductForm();
            loadProducts(productSearch);
            loadStock(stockSearch, selectedWarehouseId);
            loadCategories();
        } catch (err) {
            toast.error(err.message || 'Failed to save product');
        } finally {
            setProductSaving(false);
        }
    };

    const startEditProduct = (product) => {
        if (!canEdit) {
            return;
        }

        setEditingProductId(product.product_id);
        setProductForm({
            name: product.name || '',
            sku: product.sku || '',
            unit: product.unit || '',
            category_id: product.category_id || '',
            category_name: '',
            reorder_level: product.reorder_level ?? 0,
            initial_stock: '',
            warehouse_id: product.warehouse_id || 1
        });
    };

    const getRowValue = (row, key) => {
        const draft = draftById[row.inventory_id];
        if (draft && Object.prototype.hasOwnProperty.call(draft, key)) {
            return draft[key];
        }
        return row[key];
    };

    const updateDraft = (inventoryId, key, value) => {
        setDraftById((prev) => ({
            ...prev,
            [inventoryId]: {
                ...(prev[inventoryId] || {}),
                [key]: value
            }
        }));
    };

    const startCellEdit = (row, key) => {
        if (!canEdit) {
            return;
        }

        setDraftById((prev) => ({
            ...prev,
            [row.inventory_id]: {
                on_hand: prev[row.inventory_id]?.on_hand ?? row.on_hand,
                free_to_use: prev[row.inventory_id]?.free_to_use ?? row.free_to_use,
                ...prev[row.inventory_id]
            }
        }));
        setEditingCell({ inventoryId: row.inventory_id, key });
    };

    const isDirty = (row) => {
        const draft = draftById[row.inventory_id];
        if (!draft) {
            return false;
        }
        const onHand = Number(draft.on_hand);
        const freeToUse = Number(draft.free_to_use);
        return onHand !== row.on_hand || freeToUse !== row.free_to_use;
    };

    const resetDraft = (inventoryId) => {
        setDraftById((prev) => {
            const next = { ...prev };
            delete next[inventoryId];
            return next;
        });
    };

    const saveRow = async (row) => {
        const draft = draftById[row.inventory_id];
        if (!draft) {
            return;
        }

        const payload = {
            on_hand: Number(draft.on_hand),
            free_to_use: Number(draft.free_to_use)
        };

        if (Number.isNaN(payload.on_hand) || Number.isNaN(payload.free_to_use)) {
            toast.error('On Hand and Free to Use must be valid numbers');
            setError('On Hand and Free to Use must be valid numbers');
            return;
        }

        if (payload.on_hand < 0 || payload.free_to_use < 0) {
            toast.error('Values cannot be negative');
            setError('Values cannot be negative');
            return;
        }

        if (payload.free_to_use > payload.on_hand) {
            toast.error('Free to Use cannot exceed On Hand');
            setError('Free to Use cannot exceed On Hand');
            return;
        }

        setSavingId(row.inventory_id);
        setError('');

        try {
            const response = await fetch(`http://localhost:5000/inventory/stock/${row.inventory_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let message = await response.text();
                if (response.status === 401 || response.status === 403) {
                    message = 'Not authorized to update stock.';
                }
                throw new Error(message || 'Failed to save stock row');
            }

            const result = await response.json();
            setRows((prev) =>
                prev.map((existing) =>
                    existing.inventory_id === row.inventory_id
                        ? {
                              ...existing,
                              on_hand: result.stock.on_hand,
                              free_to_use: result.stock.free_to_use
                          }
                        : existing
                )
            );
            toast.success('Stock updated successfully');
            resetDraft(row.inventory_id);
        } catch (err) {
            toast.error(err.message || 'Failed to save stock row');
            setError(err.message || 'Failed to save stock row');
        } finally {
            setSavingId(null);
        }
    };

    const roleNote = useMemo(() => {
        if (canEdit) {
            return 'Inline editing enabled for your role';
        }
        return 'Read-only view for staff role';
    }, [canEdit]);

    return (
        <div className="min-h-screen bg-[#0a0f1c] text-slate-100">
            <header className="border-b border-[#1f2a44] bg-[#0f1830]">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
                    <nav className="flex flex-wrap items-center gap-2">
                        {NAV_TABS.map((tab) => {
                            const isStock = tab.id === 'stock';
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => onNavigate && onNavigate(tab.id)}
                                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                        isStock
                                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-full border border-[#2b3d65] bg-[#111f3b] px-3 py-1.5">
                            <User className="h-4 w-4 text-cyan-300" />
                            <span className="text-sm text-slate-200">{username || 'User'}</span>
                            <span className="rounded-full bg-[#24375d] px-2 py-0.5 text-xs uppercase tracking-wide text-cyan-200">
                                {role}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onLogout}
                            className="rounded-lg border border-red-500/30 p-2 text-red-300 hover:bg-red-500/10"
                            aria-label="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-7xl px-6 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Products</h1>
                        <p className="mt-1 text-sm text-slate-400">Create/update products, product categories, reorder rules, and stock by location.</p>
                        <p className="mt-1 text-xs text-cyan-300">{roleNote}</p>
                    </div>
                </div>

                <section className="mb-6 rounded-2xl border border-[#23345b] bg-[#101a30] p-4 md:p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Product Management</h2>
                        <p className="text-xs text-slate-400">Fields: Name, SKU/Code, Category, Unit, Initial stock (optional), Reorder rule</p>
                    </div>

                    <form onSubmit={submitProduct} className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <input
                            type="text"
                            placeholder="Name"
                            value={productForm.name}
                            onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                            className="rounded-lg border border-[#2b3d65] bg-[#111f3b] px-3 py-2 text-sm outline-none focus:border-cyan-400"
                            disabled={!canEdit}
                        />
                        <input
                            type="text"
                            placeholder="SKU / Code"
                            value={productForm.sku}
                            onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))}
                            className="rounded-lg border border-[#2b3d65] bg-[#111f3b] px-3 py-2 text-sm outline-none focus:border-cyan-400"
                            disabled={!canEdit}
                        />
                        <input
                            type="text"
                            placeholder="Unit of Measure"
                            value={productForm.unit}
                            onChange={(event) => setProductForm((prev) => ({ ...prev, unit: event.target.value }))}
                            className="rounded-lg border border-[#2b3d65] bg-[#111f3b] px-3 py-2 text-sm outline-none focus:border-cyan-400"
                            disabled={!canEdit}
                        />
                        <input
                            type="number"
                            min="0"
                            placeholder="Reorder Level"
                            value={productForm.reorder_level}
                            onChange={(event) => setProductForm((prev) => ({ ...prev, reorder_level: event.target.value }))}
                            className="rounded-lg border border-[#2b3d65] bg-[#111f3b] px-3 py-2 text-sm outline-none focus:border-cyan-400"
                            disabled={!canEdit}
                        />

                        <select
                            value={productForm.category_id}
                            onChange={(event) => setProductForm((prev) => ({ ...prev, category_id: event.target.value, category_name: '' }))}
                            className="rounded-lg border border-[#2b3d65] bg-[#111f3b] px-3 py-2 text-sm outline-none focus:border-cyan-400"
                            disabled={!canEdit}
                        >
                            <option value="">Select category</option>
                            {categories.map((category) => (
                                <option key={category.category_id} value={category.category_id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Or new category"
                            value={productForm.category_name}
                            onChange={(event) => setProductForm((prev) => ({ ...prev, category_name: event.target.value, category_id: '' }))}
                            className="rounded-lg border border-[#2b3d65] bg-[#111f3b] px-3 py-2 text-sm outline-none focus:border-cyan-400"
                            disabled={!canEdit}
                        />
                        <input
                            type="number"
                            min="0"
                            placeholder="Initial stock (optional)"
                            value={productForm.initial_stock}
                            onChange={(event) => setProductForm((prev) => ({ ...prev, initial_stock: event.target.value }))}
                            className="rounded-lg border border-[#2b3d65] bg-[#111f3b] px-3 py-2 text-sm outline-none focus:border-cyan-400"
                            disabled={!canEdit}
                        />
                        <input
                            type="number"
                            min="1"
                            placeholder="Warehouse ID"
                            value={productForm.warehouse_id}
                            onChange={(event) => setProductForm((prev) => ({ ...prev, warehouse_id: event.target.value }))}
                            className="rounded-lg border border-[#2b3d65] bg-[#111f3b] px-3 py-2 text-sm outline-none focus:border-cyan-400"
                            disabled={!canEdit}
                        />

                        <div className="md:col-span-4 flex items-center gap-2">
                            <button
                                type="submit"
                                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                                disabled={!canEdit || productSaving}
                            >
                                {productSaving ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
                            </button>
                            {editingProductId ? (
                                <button
                                    type="button"
                                    className="rounded-lg border border-slate-500/50 px-4 py-2 text-sm text-slate-300"
                                    onClick={resetProductForm}
                                    disabled={productSaving}
                                >
                                    Cancel Edit
                                </button>
                            ) : null}
                        </div>
                    </form>
                </section>

                <section className="mb-6 rounded-2xl border border-[#23345b] bg-[#101a30] p-4 md:p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Products List</h2>
                        <input
                            type="text"
                            value={productSearch}
                            onChange={(event) => setProductSearch(event.target.value)}
                            placeholder="Search by name or SKU"
                            className="w-80 rounded-xl border border-[#2b3d65] bg-[#101d37] px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left">
                            <thead>
                                <tr className="border-b border-slate-700/60">
                                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-400">Name</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-400">SKU</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-400">Category</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-400">Unit</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-400">Reorder Rule</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-400">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={`${product.product_id}-${product.inventory_id || 'none'}`} className="border-b border-dashed border-slate-700/60">
                                        <td className="px-4 py-3 text-sm text-white">{product.name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{product.sku}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{product.category}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{product.unit}</td>
                                        <td className="px-4 py-3 text-sm text-amber-300">Low at {product.reorder_level}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {canEdit ? (
                                                <button
                                                    type="button"
                                                    className="rounded-md border border-cyan-500/30 px-2.5 py-1 text-xs text-cyan-300"
                                                    onClick={() => startEditProduct(product)}
                                                >
                                                    Edit
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-500">Read only</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="rounded-2xl border border-[#23345b] bg-[#101a30] p-4 md:p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Stock Availability Per Location</h2>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={stockSearch}
                                    onChange={(event) => setStockSearch(event.target.value)}
                                    placeholder="Search by name or SKU"
                                    className="w-80 rounded-xl border border-[#2b3d65] bg-[#101d37] py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowWarehouseFilter((prev) => !prev)}
                                className="rounded-xl border border-[#2b3d65] bg-[#101d37] px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-300"
                            >
                                {showWarehouseFilter ? 'Hide Filter' : 'Filter'}
                            </button>
                            {showWarehouseFilter ? (
                                <select
                                    value={selectedWarehouseId}
                                    onChange={(event) => setSelectedWarehouseId(event.target.value)}
                                    className="rounded-xl border border-[#2b3d65] bg-[#101d37] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                                >
                                    <option value="all">All Warehouses</option>
                                    {warehouseOptions.map((warehouse) => (
                                        <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name}
                                        </option>
                                    ))}
                                </select>
                            ) : null}
                        </div>
                    </div>
                    {error ? (
                        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                            {error}
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="py-10 text-center text-slate-400">Loading stock...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] text-left">
                                <thead>
                                    <tr className="border-b border-slate-700/60">
                                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-400">Product</th>
                                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-400">Per Unit Cost</th>
                                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-400">On Hand</th>
                                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-400">Free to Use</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => {
                                        const dirty = isDirty(row);
                                        const rowOnHand = getRowValue(row, 'on_hand');
                                        const rowFreeToUse = getRowValue(row, 'free_to_use');

                                        return (
                                            <tr
                                                key={row.inventory_id}
                                                className="border-b border-dashed border-slate-700/60 align-top last:border-b-0"
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="font-semibold text-white">{row.product}</div>
                                                    <div className="text-xs text-slate-500">{row.warehouse}</div>
                                                </td>
                                                <td className="px-4 py-4 text-slate-300">
                                                    {Number(row.per_unit_cost).toFixed(2)} Rs
                                                </td>
                                                <td className="px-4 py-4">
                                                    {canEdit ? (
                                                        editingCell?.inventoryId === row.inventory_id &&
                                                        editingCell?.key === 'on_hand' ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                autoFocus
                                                                value={rowOnHand}
                                                                onBlur={() => setEditingCell(null)}
                                                                onChange={(event) =>
                                                                    updateDraft(row.inventory_id, 'on_hand', event.target.value)
                                                                }
                                                                className="w-24 rounded-md border border-[#2b3d65] bg-[#132040] px-2 py-1 text-sm text-white outline-none focus:border-cyan-400"
                                                            />
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => startCellEdit(row, 'on_hand')}
                                                                className="rounded px-1 py-0.5 font-medium text-slate-100 hover:bg-[#18284a]"
                                                            >
                                                                {rowOnHand}
                                                            </button>
                                                        )
                                                    ) : (
                                                        <span className="font-medium text-slate-100">{row.on_hand}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {canEdit ? (
                                                            editingCell?.inventoryId === row.inventory_id &&
                                                            editingCell?.key === 'free_to_use' ? (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    autoFocus
                                                                    value={rowFreeToUse}
                                                                    onBlur={() => setEditingCell(null)}
                                                                    onChange={(event) =>
                                                                        updateDraft(row.inventory_id, 'free_to_use', event.target.value)
                                                                    }
                                                                    className="w-24 rounded-md border border-[#2b3d65] bg-[#132040] px-2 py-1 text-sm text-white outline-none focus:border-cyan-400"
                                                                />
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startCellEdit(row, 'free_to_use')}
                                                                    className="rounded px-1 py-0.5 font-medium text-slate-100 hover:bg-[#18284a]"
                                                                >
                                                                    {rowFreeToUse}
                                                                </button>
                                                            )
                                                        ) : (
                                                            <span className="font-medium text-slate-100">{row.free_to_use}</span>
                                                        )}
                                                    </div>

                                                    {dirty && canEdit ? (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => saveRow(row)}
                                                                disabled={savingId === row.inventory_id}
                                                                className="rounded-md bg-cyan-500 px-2.5 py-1 text-xs font-semibold text-slate-950 disabled:opacity-60"
                                                            >
                                                                {savingId === row.inventory_id ? 'Saving...' : 'Save'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => resetDraft(row.inventory_id)}
                                                                disabled={savingId === row.inventory_id}
                                                                className="rounded-md border border-slate-500/50 px-2.5 py-1 text-xs font-semibold text-slate-300 disabled:opacity-60"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {!rows.length && !loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                                No stock rows found.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default StockScreen;
