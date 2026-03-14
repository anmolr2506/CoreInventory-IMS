import React, { useEffect, useState } from 'react';
import {
    TrendingUp, TrendingDown, Package, CheckCircle2, Clock,
    AlertCircle, Plus, Search, Eye, EyeOff, LogOut
} from 'lucide-react';

const ManagerDashboard = ({ username, onLogout }) => {
    const [activeTab, setActiveTab] = useState('inventory');
    const [inventory, setInventory] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        product_id: '',
        warehouse_id: '',
        supplier_id: '',
        quantity: '',
        customer_name: ''
    });

    const token = localStorage.getItem('token');

    // Fetch inventory data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const headers = { Authorization: `Bearer ${token}` };

                const [invRes, appRes, recRes, delRes] = await Promise.all([
                    fetch('http://localhost:5000/inventory', { headers }),
                    fetch('http://localhost:5000/approval/pending', { headers }),
                    fetch('http://localhost:5000/inventory/receipts', { headers }),
                    fetch('http://localhost:5000/inventory/deliveries', { headers })
                ]);

                if (invRes.ok) setInventory(await invRes.json());
                if (appRes.ok) setPendingApprovals(await appRes.json());
                if (recRes.ok) setReceipts(await recRes.json());
                if (delRes.ok) setDeliveries(await delRes.json());
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const handleCreateReceipt = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/inventory/receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('Receipt created (Pending approval)');
                setShowForm(false);
                // Refresh data
                window.location.reload();
            } else {
                alert('Error creating receipt');
            }
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const handleApproval = async (type, id, action) => {
        try {
            const response = await fetch(
                `http://localhost:5000/approval/${type}/${id}/${action}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ approval_notes: '' })
                }
            );

            if (response.ok) {
                alert(`${type} ${action}d successfully`);
                window.location.reload();
            }
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const lowStockItems = inventory.filter(item => item.needs_reorder);
    const pendingCount = pendingApprovals.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0f1c]">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    <p className="text-slate-400">Loading manager dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f1c] text-white">
            {/* Header */}
            <div className="bg-[#162032] border-b border-[#27354f] p-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Inventory Manager Dashboard</h1>
                        <p className="text-slate-400 mt-1">Welcome, {username}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-[#162032] p-6 rounded-lg border border-[#27354f]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Items</p>
                                <p className="text-2xl font-bold mt-2">{inventory.length}</p>
                            </div>
                            <Package className="w-8 h-8 text-cyan-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-[#162032] p-6 rounded-lg border border-[#27354f]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Pending Approvals</p>
                                <p className="text-2xl font-bold mt-2 text-yellow-500">{pendingCount}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-[#162032] p-6 rounded-lg border border-[#27354f]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Low Stock Items</p>
                                <p className="text-2xl font-bold mt-2 text-red-500">{lowStockItems.length}</p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-[#162032] p-6 rounded-lg border border-[#27354f]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Receipts</p>
                                <p className="text-2xl font-bold mt-2">{receipts.length}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6 border-b border-[#27354f]">
                    {['inventory', 'approvals', 'receipts', 'deliveries'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-semibold transition ${
                                activeTab === tab
                                    ? 'text-cyan-500 border-b-2 border-cyan-500'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'inventory' && (
                    <div className="bg-[#162032] rounded-lg border border-[#27354f] p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Inventory Overview</h2>
                            <button
                                onClick={() => setShowForm(true)}
                                className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg transition"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create Receipt</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-[#27354f]">
                                    <tr>
                                        <th className="text-left py-3 px-4">Product</th>
                                        <th className="text-left py-3 px-4">Warehouse</th>
                                        <th className="text-left py-3 px-4">Quantity</th>
                                        <th className="text-left py-3 px-4">Reorder Level</th>
                                        <th className="text-left py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventory.map(item => (
                                        <tr key={item.inventory_id} className="border-b border-[#27354f] hover:bg-[#1a1f2e] transition">
                                            <td className="py-3 px-4">{item.product_name}</td>
                                            <td className="py-3 px-4">{item.warehouse_name}</td>
                                            <td className="py-3 px-4 font-semibold">{item.quantity}</td>
                                            <td className="py-3 px-4">{item.reorder_level}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    item.needs_reorder 
                                                        ? 'bg-red-500/20 text-red-400' 
                                                        : 'bg-green-500/20 text-green-400'
                                                }`}>
                                                    {item.needs_reorder ? 'Low Stock' : 'OK'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'approvals' && (
                    <div className="bg-[#162032] rounded-lg border border-[#27354f] p-6">
                        <h2 className="text-xl font-bold mb-6">Pending Approvals</h2>
                        {pendingApprovals.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No pending approvals</p>
                        ) : (
                            <div className="space-y-4">
                                {pendingApprovals.map(approval => (
                                    <div key={`${approval.request_type}-${approval.id}`} 
                                         className="bg-[#0f172a] p-4 rounded-lg border border-[#334155] flex justify-between items-center">
                                        <div className="flex-1">
                                            <p className="font-semibold">{approval.product_name}</p>
                                            <p className="text-sm text-slate-400">
                                                {approval.request_type.toUpperCase()} - {approval.warehouse_name} - Qty: {approval.quantity}
                                            </p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleApproval(approval.request_type, approval.id, 'approve')}
                                                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-semibold transition"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleApproval(approval.request_type, approval.id, 'reject')}
                                                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-semibold transition"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'receipts' && (
                    <div className="bg-[#162032] rounded-lg border border-[#27354f] p-6">
                        <h2 className="text-xl font-bold mb-6">Receipt History</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-[#27354f]">
                                    <tr>
                                        <th className="text-left py-3 px-4">Product</th>
                                        <th className="text-left py-3 px-4">Supplier</th>
                                        <th className="text-left py-3 px-4">Qty</th>
                                        <th className="text-left py-3 px-4">Status</th>
                                        <th className="text-left py-3 px-4">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipts.map(receipt => (
                                        <tr key={receipt.receipt_id} className="border-b border-[#27354f]">
                                            <td className="py-3 px-4">{receipt.product_name}</td>
                                            <td className="py-3 px-4">{receipt.supplier_name}</td>
                                            <td className="py-3 px-4">{receipt.quantity}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    receipt.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                    receipt.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {receipt.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-400">{new Date(receipt.received_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'deliveries' && (
                    <div className="bg-[#162032] rounded-lg border border-[#27354f] p-6">
                        <h2 className="text-xl font-bold mb-6">Delivery History</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-[#27354f]">
                                    <tr>
                                        <th className="text-left py-3 px-4">Product</th>
                                        <th className="text-left py-3 px-4">Customer</th>
                                        <th className="text-left py-3 px-4">Qty</th>
                                        <th className="text-left py-3 px-4">Status</th>
                                        <th className="text-left py-3 px-4">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deliveries.map(delivery => (
                                        <tr key={delivery.delivery_id} className="border-b border-[#27354f]">
                                            <td className="py-3 px-4">{delivery.product_name}</td>
                                            <td className="py-3 px-4">{delivery.customer_name}</td>
                                            <td className="py-3 px-4">{delivery.quantity}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    delivery.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                    delivery.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {delivery.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-400">{new Date(delivery.delivered_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagerDashboard;
