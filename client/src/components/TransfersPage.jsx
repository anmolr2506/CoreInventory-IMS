import React, { useEffect, useState } from 'react';
import {
    ArrowRight, Plus, Search, AlertCircle, CheckCircle2,
    TrendingRight, Loader2, X
} from 'lucide-react';

const TransfersPage = ({ username, onLogout }) => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        product_id: '',
        from_warehouse: '',
        to_warehouse: '',
        quantity: '',
        notes: ''
    });

    const token = localStorage.getItem('token');

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const headers = { Authorization: `Bearer ${token}` };

                // Fetch transfers, warehouses, and products in parallel
                const [transferRes, warehouseRes, statsRes] = await Promise.all([
                    fetch('http://localhost:5000/transfers', { headers }),
                    fetch('http://localhost:5000/warehouses', { headers }),
                    fetch('http://localhost:5000/transfer-stats', { headers })
                ]);

                if (transferRes.ok) {
                    const data = await transferRes.json();
                    setTransfers(data.data || data);
                }

                if (warehouseRes.ok) {
                    const data = await warehouseRes.json();
                    setWarehouses(data.data || data);
                }

                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStatistics(data.data);
                }

                // Fetch products
                const productsRes = await fetch('http://localhost:5000/products', { headers });
                if (productsRes.ok) {
                    const data = await productsRes.json();
                    setProducts(data);
                }
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [token]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!formData.product_id || !formData.from_warehouse || !formData.to_warehouse || !formData.quantity) {
            alert('Please fill all required fields');
            return;
        }

        if (formData.from_warehouse === formData.to_warehouse) {
            alert('Source and destination warehouses must be different');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    product_id: parseInt(formData.product_id),
                    from_warehouse: parseInt(formData.from_warehouse),
                    to_warehouse: parseInt(formData.to_warehouse),
                    quantity: parseInt(formData.quantity),
                    notes: formData.notes
                })
            });

            if (response.ok) {
                setSuccessMessage('Transfer created successfully!');
                setFormData({ product_id: '', from_warehouse: '', to_warehouse: '', quantity: '', notes: '' });
                setShowForm(false);

                // Refresh transfers list
                const res = await fetch('http://localhost:5000/transfers', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTransfers(data.data || data);
                }

                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Failed to create transfer'));
            }
        } catch (err) {
            console.error('Error creating transfer:', err);
            alert('Error creating transfer');
        }
    };

    const filteredTransfers = transfers.filter(t =>
        (t.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.from_warehouse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.to_warehouse?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            {/* Success Message */}
            {successMessage && (
                <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg">
                    <CheckCircle2 size={20} />
                    {successMessage}
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <TrendingRight className="text-cyan-500" />
                            Internal Transfers
                        </h1>
                        <button
                            onClick={() => onLogout()}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                        >
                            Logout
                        </button>
                    </div>
                    <p className="text-gray-400">Move stock between warehouses</p>
                </div>

                {/* Statistics Cards */}
                {statistics && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-slate-700 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">Total Transfers</p>
                            <p className="text-2xl font-bold text-white">{statistics.total_transfers || 0}</p>
                        </div>
                        <div className="bg-slate-700 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">Total Quantity Transferred</p>
                            <p className="text-2xl font-bold text-white">{statistics.total_quantity_transferred || 0}</p>
                        </div>
                        <div className="bg-slate-700 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">Unique Products Moved</p>
                            <p className="text-2xl font-bold text-white">{statistics.unique_products || 0}</p>
                        </div>
                    </div>
                )}

                {/* Create Transfer Form */}
                {showForm && (
                    <div className="bg-slate-700 rounded-lg p-6 mb-8 relative">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-600 rounded-lg"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-6">Create New Transfer</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Product Select */}
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Product *</label>
                                <select
                                    name="product_id"
                                    value={formData.product_id}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-600 border-b border-slate-500 text-white px-3 py-2 focus:border-cyan-500 focus:outline-none"
                                >
                                    <option value="">Select Product</option>
                                    {products.map(p => (
                                        <option key={p.product_id} value={p.product_id}>
                                            {p.name} (SKU: {p.sku})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Warehouse Select */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-300 mb-2">From Warehouse *</label>
                                    <select
                                        name="from_warehouse"
                                        value={formData.from_warehouse}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-600 border-b border-slate-500 text-white px-3 py-2 focus:border-cyan-500 focus:outline-none"
                                    >
                                        <option value="">Select Source</option>
                                        {warehouses.map(w => (
                                            <option key={w.warehouse_id} value={w.warehouse_id}>
                                                {w.name} ({w.short_code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-300 mb-2">To Warehouse *</label>
                                    <select
                                        name="to_warehouse"
                                        value={formData.to_warehouse}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-600 border-b border-slate-500 text-white px-3 py-2 focus:border-cyan-500 focus:outline-none"
                                    >
                                        <option value="">Select Destination</option>
                                        {warehouses.map(w => (
                                            <option key={w.warehouse_id} value={w.warehouse_id}>
                                                {w.name} ({w.short_code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Quantity *</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    placeholder="Enter quantity"
                                    min="1"
                                    className="w-full bg-slate-600 border-b border-slate-500 text-white px-3 py-2 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    placeholder="Add any notes about this transfer"
                                    rows="3"
                                    className="w-full bg-slate-600 border-b border-slate-500 text-white px-3 py-2 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 rounded-lg transition"
                                >
                                    Create Transfer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Search and Create Button */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search transfers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-700 border-b border-slate-600 text-white px-10 py-2 focus:border-cyan-500 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Create Transfer
                    </button>
                </div>

                {/* Transfers List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-cyan-500" size={32} />
                    </div>
                ) : filteredTransfers.length === 0 ? (
                    <div className="bg-slate-700 rounded-lg p-12 text-center">
                        <AlertCircle className="mx-auto mb-4 text-gray-400" size={32} />
                        <p className="text-gray-400">No transfers found</p>
                    </div>
                ) : (
                    <div className="bg-slate-700 rounded-lg overflow-hidden">
                        {filteredTransfers.map((transfer, idx) => (
                            <div
                                key={transfer.transfer_id}
                                className={`border-b border-slate-600 p-4 ${idx % 2 === 0 ? 'bg-slate-700' : 'bg-slate-750'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-white font-semibold">{transfer.product_name}</p>
                                        <div className="flex items-center gap-2 mt-2 text-gray-400">
                                            <span>{transfer.from_warehouse}</span>
                                            <ArrowRight size={16} className="text-cyan-500" />
                                            <span>{transfer.to_warehouse}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-bold text-lg">{transfer.quantity}</p>
                                        <p className="text-gray-400 text-sm">{transfer.transferred_by}</p>
                                        <p className="text-gray-500 text-xs mt-1">
                                            {new Date(transfer.transferred_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransfersPage;
