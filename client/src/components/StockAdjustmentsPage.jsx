import React, { useEffect, useState } from 'react';
import {
    RefreshCw, Plus, Search, AlertCircle, CheckCircle2,
    TrendingDown, TrendingUp, Loader2, X
} from 'lucide-react';

const StockAdjustmentsPage = ({ username, onLogout }) => {
    const [adjustments, setAdjustments] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [formData, setFormData] = useState({
        product_id: '',
        warehouse_id: '',
        counted_quantity: '',
        reason: ''
    });

    const token = localStorage.getItem('token');

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const headers = { Authorization: `Bearer ${token}` };

                // Fetch adjustments and inventory in parallel
                const [adjRes, invRes] = await Promise.all([
                    fetch('http://localhost:5000/adjustments', { headers }),
                    fetch('http://localhost:5000/inventory', { headers })
                ]);

                if (adjRes.ok) {
                    const data = await adjRes.json();
                    setAdjustments(data.data || data);
                }

                if (invRes.ok) {
                    const data = await invRes.json();
                    setInventory(data.data || data);
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

        if (name === 'product_id') {
            const product = inventory.find(p => p.product_id === parseInt(value));
            setSelectedProduct(product);
            setFormData(prev => ({
                ...prev,
                [name]: value,
                warehouse_id: product ? product.warehouse_id : ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!formData.product_id || formData.warehouse_id === '' || formData.counted_quantity === '' || !formData.reason) {
            alert('Please fill all required fields');
            return;
        }

        if (formData.counted_quantity < 0) {
            alert('Counted quantity cannot be negative');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/adjustment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    product_id: parseInt(formData.product_id),
                    warehouse_id: parseInt(formData.warehouse_id),
                    counted_quantity: parseInt(formData.counted_quantity),
                    reason: formData.reason
                })
            });

            if (response.ok) {
                const result = await response.json();
                setSuccessMessage(`Stock adjusted: ${result.message}`);
                setFormData({ product_id: '', warehouse_id: '', counted_quantity: '', reason: '' });
                setSelectedProduct(null);
                setShowForm(false);

                // Refresh data
                const [adjRes, invRes] = await Promise.all([
                    fetch('http://localhost:5000/adjustments', {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    fetch('http://localhost:5000/inventory', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                if (adjRes.ok) {
                    const data = await adjRes.json();
                    setAdjustments(data.data || data);
                }

                if (invRes.ok) {
                    const data = await invRes.json();
                    setInventory(data.data || data);
                }

                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Failed to create adjustment'));
            }
        } catch (err) {
            console.error('Error creating adjustment:', err);
            alert('Error creating adjustment');
        }
    };

    const filteredAdjustments = adjustments.filter(a =>
        (a.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.reason?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getAdjustmentColor = (adjustment) => {
        if (adjustment > 0) return 'text-green-400';
        if (adjustment < 0) return 'text-red-400';
        return 'text-gray-400';
    };

    const getAdjustmentIcon = (adjustment) => {
        if (adjustment > 0) return <TrendingUp className="text-green-400" size={16} />;
        if (adjustment < 0) return <TrendingDown className="text-red-400" size={16} />;
        return null;
    };

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
                            <RefreshCw className="text-cyan-500" />
                            Stock Adjustments
                        </h1>
                        <button
                            onClick={() => onLogout()}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                        >
                            Logout
                        </button>
                    </div>
                    <p className="text-gray-400">Fix mismatches between recorded and physical stock counts</p>
                </div>

                {/* Create Adjustment Form */}
                {showForm && (
                    <div className="bg-slate-700 rounded-lg p-6 mb-8 relative">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-600 rounded-lg"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-4">Create Stock Adjustment</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Instructions */}
                            <div className="bg-slate-600 border-l-4 border-cyan-500 p-4 rounded mb-6">
                                <p className="text-gray-200">
                                    <strong>Instructions:</strong> Perform a physical count of the product in the warehouse.
                                    Enter the counted quantity below. The system will automatically update the inventory
                                    and log the adjustment.
                                </p>
                            </div>

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
                                    {inventory.map(item => (
                                        <option key={`${item.product_id}-${item.warehouse_id}`} value={item.product_id}>
                                            {item.product_name} - {item.warehouse_name} (Current: {item.quantity})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Product Info */}
                            {selectedProduct && (
                                <div className="bg-slate-600 p-4 rounded">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-400">SKU</p>
                                            <p className="text-white font-semibold">{selectedProduct.sku}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Current Stock</p>
                                            <p className="text-white font-semibold">{selectedProduct.quantity}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Warehouse</p>
                                            <p className="text-white font-semibold">{selectedProduct.warehouse_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Status</p>
                                            <p className={`font-semibold ${
                                                selectedProduct.status === 'out_of_stock' ? 'text-red-400' :
                                                    selectedProduct.status === 'low_stock' ? 'text-yellow-400' :
                                                        'text-green-400'
                                            }`}>
                                                {selectedProduct.status?.replace('_', ' ').toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Counted Quantity */}
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">
                                    Counted Quantity (from physical count) *
                                </label>
                                <input
                                    type="number"
                                    name="counted_quantity"
                                    value={formData.counted_quantity}
                                    onChange={handleInputChange}
                                    placeholder="Enter the quantity you counted"
                                    min="0"
                                    className="w-full bg-slate-600 border-b border-slate-500 text-white px-3 py-2 focus:border-cyan-500 focus:outline-none"
                                />
                                {selectedProduct && formData.counted_quantity && (
                                    <p className={`text-sm mt-2 ${getAdjustmentColor({
                                        counted: parseInt(formData.counted_quantity),
                                        current: selectedProduct.quantity
                                    })}`}>
                                        Adjustment: {(parseInt(formData.counted_quantity) - selectedProduct.quantity) > 0 ? '+' : ''}{parseInt(formData.counted_quantity) - selectedProduct.quantity}
                                    </p>
                                )}
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Reason for Adjustment *</label>
                                <select
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-600 border-b border-slate-500 text-white px-3 py-2 focus:border-cyan-500 focus:outline-none mb-3"
                                >
                                    <option value="">Select Reason</option>
                                    <option value="Physical Count Mismatch">Physical Count Mismatch</option>
                                    <option value="Damage/Loss">Damage/Loss</option>
                                    <option value="Data Entry Error">Data Entry Error</option>
                                    <option value="Theft/Shrinkage">Theft/Shrinkage</option>
                                    <option value="Return/Rework">Return/Rework</option>
                                    <option value="Expired Stock">Expired Stock</option>
                                    <option value="Other">Other</option>
                                </select>
                                {formData.reason === 'Other' && (
                                    <textarea
                                        name="reason"
                                        placeholder="Please specify the reason"
                                        value={formData.reason}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            reason: e.target.value
                                        }))}
                                        className="w-full bg-slate-600 border-b border-slate-500 text-white px-3 py-2 focus:border-cyan-500 focus:outline-none"
                                        rows="2"
                                    />
                                )}
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 rounded-lg transition"
                                >
                                    Record Adjustment
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setFormData({ product_id: '', warehouse_id: '', counted_quantity: '', reason: '' });
                                        setSelectedProduct(null);
                                    }}
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
                            placeholder="Search adjustments..."
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
                        New Adjustment
                    </button>
                </div>

                {/* Adjustments List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-cyan-500" size={32} />
                    </div>
                ) : filteredAdjustments.length === 0 ? (
                    <div className="bg-slate-700 rounded-lg p-12 text-center">
                        <AlertCircle className="mx-auto mb-4 text-gray-400" size={32} />
                        <p className="text-gray-400">No adjustments found</p>
                    </div>
                ) : (
                    <div className="bg-slate-700 rounded-lg overflow-hidden">
                        {filteredAdjustments.map((adjustment, idx) => (
                            <div
                                key={adjustment.adjustment_id}
                                className={`border-b border-slate-600 p-4 ${idx % 2 === 0 ? 'bg-slate-700' : 'bg-slate-750'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-white font-semibold">{adjustment.product_name}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-gray-400 text-sm">{adjustment.warehouse_name}</span>
                                            <span className="text-gray-500 text-xs">•</span>
                                            <span className="text-gray-400 text-sm">{adjustment.reason}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`flex items-center gap-2 justify-end ${getAdjustmentColor(adjustment.adjustment)}`}>
                                            {getAdjustmentIcon(adjustment.adjustment)}
                                            <p className="font-bold text-lg">
                                                {adjustment.adjustment > 0 ? '+' : ''}{adjustment.adjustment}
                                            </p>
                                        </div>
                                        <p className="text-gray-400 text-sm">{adjustment.adjusted_by}</p>
                                        <p className="text-gray-500 text-xs mt-1">
                                            {new Date(adjustment.adjusted_at).toLocaleDateString()}
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

export default StockAdjustmentsPage;
