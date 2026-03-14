import React, { useEffect, useState } from 'react';
import {
    ArrowRight, Plus, Search, AlertCircle, CheckCircle2,
    ArrowRightLeft, Loader2, X
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
        <div className="flex-1 bg-[#0a0f1c] overflow-y-auto animate-[fade-in_0.6s_ease-out]">
            {successMessage && (
                <div className="fixed top-4 right-4 z-40 bg-emerald-500/90 text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                    <CheckCircle2 size={18} />
                    {successMessage}
                </div>
            )}

            <div className="px-8 py-6 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ArrowRightLeft className="w-6 h-6 text-cyan-400" />
                        Move History
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Monitor and create internal transfers between warehouses{username ? ` for ${username}` : ''}.
                    </p>
                </div>

                {statistics && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5">
                            <p className="text-slate-400 text-sm">Total Transfers</p>
                            <p className="text-2xl font-bold text-white mt-1">{statistics.total_transfers || 0}</p>
                        </div>
                        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5">
                            <p className="text-slate-400 text-sm">Total Quantity Transferred</p>
                            <p className="text-2xl font-bold text-white mt-1">{statistics.total_quantity_transferred || 0}</p>
                        </div>
                        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5">
                            <p className="text-slate-400 text-sm">Unique Products Moved</p>
                            <p className="text-2xl font-bold text-white mt-1">{statistics.unique_products || 0}</p>
                        </div>
                    </div>
                )}

                {showForm && (
                    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 relative">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-4 right-4 p-2 rounded-lg text-slate-500 hover:text-white hover:bg-[#1e293b] transition-all"
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-lg font-bold text-white mb-5">Create New Transfer</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Product *</label>
                                <select
                                    name="product_id"
                                    value={formData.product_id}
                                    onChange={handleInputChange}
                                    className="w-full bg-[#1e293b]/70 border border-[#334155]/60 rounded-xl text-white px-3 py-2.5 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 focus:outline-none"
                                >
                                    <option value="">Select Product</option>
                                    {products.map(p => (
                                        <option key={p.product_id} value={p.product_id}>
                                            {p.name} (SKU: {p.sku})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-2">From Warehouse *</label>
                                    <select
                                        name="from_warehouse"
                                        value={formData.from_warehouse}
                                        onChange={handleInputChange}
                                        className="w-full bg-[#1e293b]/70 border border-[#334155]/60 rounded-xl text-white px-3 py-2.5 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 focus:outline-none"
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
                                    <label className="block text-sm text-slate-300 mb-2">To Warehouse *</label>
                                    <select
                                        name="to_warehouse"
                                        value={formData.to_warehouse}
                                        onChange={handleInputChange}
                                        className="w-full bg-[#1e293b]/70 border border-[#334155]/60 rounded-xl text-white px-3 py-2.5 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 focus:outline-none"
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

                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Quantity *</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    placeholder="Enter quantity"
                                    min="1"
                                    className="w-full bg-[#1e293b]/70 border border-[#334155]/60 rounded-xl text-white px-3 py-2.5 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    placeholder="Add any notes about this transfer"
                                    rows="3"
                                    className="w-full bg-[#1e293b]/70 border border-[#334155]/60 rounded-xl text-white px-3 py-2.5 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-2.5 rounded-xl transition-all"
                                >
                                    Create Transfer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 bg-[#1e293b] hover:bg-[#263348] border border-[#334155] text-white font-semibold py-2.5 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search by product or warehouse..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1e293b]/70 border border-[#334155]/60 rounded-xl text-white pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                        <Plus size={18} />
                        {showForm ? 'Hide Form' : 'Create Transfer'}
                    </button>
                </div>

                {loading ? (
                    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-12 flex items-center justify-center">
                        <Loader2 className="animate-spin text-cyan-500" size={30} />
                    </div>
                ) : filteredTransfers.length === 0 ? (
                    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-12 text-center">
                        <AlertCircle className="mx-auto mb-3 text-slate-500" size={30} />
                        <p className="text-slate-400">No transfers found</p>
                    </div>
                ) : (
                    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden">
                        {filteredTransfers.map((transfer, idx) => (
                            <div
                                key={transfer.transfer_id}
                                className={`p-4 ${idx !== filteredTransfers.length - 1 ? 'border-b border-[#1e293b]' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white font-semibold truncate">{transfer.product_name}</p>
                                        <div className="flex items-center gap-2 mt-1.5 text-slate-400 text-sm">
                                            <span className="truncate">{transfer.from_warehouse}</span>
                                            <ArrowRight size={14} className="text-cyan-500 flex-shrink-0" />
                                            <span className="truncate">{transfer.to_warehouse}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-white font-bold text-lg">{transfer.quantity}</p>
                                        <p className="text-slate-400 text-sm">{transfer.transferred_by}</p>
                                        <p className="text-slate-500 text-xs mt-1">
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
