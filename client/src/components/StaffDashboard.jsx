import React, { useEffect, useState } from 'react';
import {
    TrendingUp, Package, Clock, AlertCircle, Plus, 
    LogOut, BoxIcon, CheckCircle, ChevronDown
} from 'lucide-react';
import SettingsPage from './SettingsPage.jsx';

const StaffDashboard = ({ username, onLogout }) => {
    const [activeTab, setActiveTab] = useState('inventory');
    const [currentPage, setCurrentPage] = useState('dashboard'); // dashboard, settings
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [operations, setOperations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [operationForm, setOperationForm] = useState({
        operation_type: 'picking',
        product_id: '',
        warehouse_id: '',
        quantity: '',
        notes: ''
    });
    const [transferForm, setTransferForm] = useState({
        product_id: '',
        from_warehouse: '',
        to_warehouse: '',
        quantity: ''
    });

    const token = localStorage.getItem('token');

    // If on settings page, show settings instead
    if (currentPage === 'settings') {
        return <SettingsPage username={username} onLogout={() => {
            onLogout();
            setCurrentPage('dashboard');
        }} />;
    }

    // Get warehouses from localStorage
    useEffect(() => {
        const warehouseData = localStorage.getItem('warehouses');
        if (warehouseData) {
            const parsed = JSON.parse(warehouseData);
            setWarehouses(parsed);
            if (parsed.length > 0) {
                setSelectedWarehouse(parsed[0].warehouse_id);
                setOperationForm(prev => ({
                    ...prev,
                    warehouse_id: parsed[0].warehouse_id
                }));
                setTransferForm(prev => ({
                    ...prev,
                    from_warehouse: parsed[0].warehouse_id
                }));
            }
        }
    }, []);

    // Fetch data
    useEffect(() => {
        if (!selectedWarehouse) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const headers = { Authorization: `Bearer ${token}` };

                const [invRes, transRes, opsRes] = await Promise.all([
                    fetch('http://localhost:5000/inventory', { headers }),
                    fetch('http://localhost:5000/transfer/history', { headers }),
                    fetch(`http://localhost:5000/warehouse-operations?warehouse_id=${selectedWarehouse}`, { headers })
                ]);

                if (invRes.ok) setInventory(await invRes.json());
                if (transRes.ok) setTransfers(await transRes.json());
                if (opsRes.ok) setOperations(await opsRes.json());
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedWarehouse, token]);

    const handleWarehouseOperation = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/warehouse-operation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(operationForm)
            });

            if (response.ok) {
                alert(`${operationForm.operation_type} operation logged successfully!`);
                setOperationForm({
                    operation_type: 'picking',
                    product_id: '',
                    warehouse_id: selectedWarehouse,
                    quantity: '',
                    notes: ''
                });
                // Refresh operations
                const opsRes = await fetch(
                    `http://localhost:5000/warehouse-operations?warehouse_id=${selectedWarehouse}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (opsRes.ok) {
                    setOperations(await opsRes.json());
                }
            } else {
                const error = await response.json();
                alert(`Error: ${error}`);
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error logging operation');
        }
    };

    const handleCreateTransfer = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(transferForm)
            });

            if (response.ok) {
                alert('Transfer request created (Pending manager approval)');
                setTransferForm({
                    product_id: '',
                    from_warehouse: selectedWarehouse,
                    to_warehouse: '',
                    quantity: ''
                });
                // Refresh transfers
                const transRes = await fetch('http://localhost:5000/transfer/history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (transRes.ok) {
                    setTransfers(await transRes.json());
                }
            } else {
                const error = await response.json();
                alert(`Error: ${error}`);
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error creating transfer');
        }
    };

    const warehouseInventory = inventory.filter(item => 
        item.warehouse_id === selectedWarehouse
    );

    const pendingTransfers = transfers.filter(t => t.status === 'pending');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0f1c]">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    <p className="text-slate-400">Loading warehouse dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f1c] text-white flex flex-col">
            {/* Top Navigation Bar */}
            <div className="bg-[#162032] border-b border-[#27354f] px-8 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo/Brand */}
                    <div className="text-2xl font-bold text-cyan-500">Core Inventory</div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center space-x-1">
                        {['dashboard', 'operations', 'products', 'move-history', 'settings'].map(navItem => (
                            <div key={navItem} className="relative group">
                                <button
                                    onClick={() => {
                                        if (navItem === 'settings') {
                                            setSettingsOpen(!settingsOpen);
                                        } else if (navItem === 'dashboard') {
                                            setCurrentPage('dashboard');
                                            setSettingsOpen(false);
                                        }
                                    }}
                                    className={`px-6 py-3 font-semibold transition-colors ${
                                        (navItem === 'dashboard' && currentPage === 'dashboard') || navItem === 'settings'
                                            ? 'text-cyan-400 border-b-2 border-cyan-400'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {navItem === 'move-history' ? 'Move History' : navItem.charAt(0).toUpperCase() + navItem.slice(1).replace('-', ' ')}
                                    {navItem === 'settings' && <ChevronDown className="inline ml-2 w-4 h-4" />}
                                </button>

                                {/* Settings Dropdown Overlay */}
                                {navItem === 'settings' && settingsOpen && (
                                    <div className="absolute left-0 mt-0 w-56 bg-[#1a2741] border border-[#27354f] rounded-lg shadow-2xl z-50 overflow-hidden">
                                        <button
                                            onClick={() => {
                                                setCurrentPage('settings');
                                                setSettingsOpen(false);
                                            }}
                                            className="w-full text-left px-6 py-4 transition-colors text-slate-300 hover:bg-[#27354f]"
                                        >
                                            <div className="font-semibold">Warehouse Settings</div>
                                            <div className="text-xs text-slate-500 mt-1">Manage warehouse details</div>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCurrentPage('settings');
                                                setSettingsOpen(false);
                                            }}
                                            className="w-full text-left px-6 py-4 transition-colors border-t border-[#27354f] text-slate-300 hover:bg-[#27354f]"
                                        >
                                            <div className="font-semibold">Location Settings</div>
                                            <div className="text-xs text-slate-500 mt-1">Manage locations within warehouses</div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* User Avatar and Logout */}
                    <div className="flex items-center space-x-4 ml-auto">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center font-bold text-white">
                                {username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm text-slate-300">{username}</span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-2 hover:bg-[#27354f] rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="bg-[#162032] border-b border-[#27354f] p-6">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Warehouse Staff Dashboard</h1>
                            <p className="text-slate-400 mt-1">Welcome, {username}</p>
                        </div>
                    </div>
                </div>

            {/* Warehouse Selector */}
            {warehouses.length > 0 && (
                <div className="bg-[#162032] border-b border-[#27354f] p-6">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-slate-400 mb-3">Assigned Warehouse:</p>
                        <select
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(parseInt(e.target.value))}
                            className="bg-[#0f172a] border border-[#334155] text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-500"
                        >
                            {warehouses.map(w => (
                                <option key={w.warehouse_id} value={w.warehouse_id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-[#162032] p-6 rounded-lg border border-[#27354f]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Warehouse Items</p>
                                <p className="text-2xl font-bold mt-2">{warehouseInventory.length}</p>
                            </div>
                            <Package className="w-8 h-8 text-cyan-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-[#162032] p-6 rounded-lg border border-[#27354f]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Pending Transfers</p>
                                <p className="text-2xl font-bold mt-2 text-yellow-500">{pendingTransfers.length}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-[#162032] p-6 rounded-lg border border-[#27354f]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Operations Today</p>
                                <p className="text-2xl font-bold mt-2">{operations.length}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-[#162032] p-6 rounded-lg border border-[#27354f]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Inventory</p>
                                <p className="text-2xl font-bold mt-2">
                                    {warehouseInventory.reduce((sum, item) => sum + item.quantity, 0)}
                                </p>
                            </div>
                            <BoxIcon className="w-8 h-8 text-purple-500 opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6 border-b border-[#27354f]">
                    {['inventory', 'operations', 'transfers'].map(tab => (
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
                        <h2 className="text-xl font-bold mb-6">Warehouse Inventory</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-[#27354f]">
                                    <tr>
                                        <th className="text-left py-3 px-4">Product</th>
                                        <th className="text-left py-3 px-4">SKU</th>
                                        <th className="text-left py-3 px-4">Quantity</th>
                                        <th className="text-left py-3 px-4">Category</th>
                                        <th className="text-left py-3 px-4">Last Updated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {warehouseInventory.map(item => (
                                        <tr key={item.inventory_id} className="border-b border-[#27354f] hover:bg-[#1a1f2e]">
                                            <td className="py-3 px-4 font-semibold">{item.product_name}</td>
                                            <td className="py-3 px-4 text-slate-400">{item.sku}</td>
                                            <td className="py-3 px-4">
                                                <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded">
                                                    {item.quantity}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">{item.category}</td>
                                            <td className="py-3 px-4 text-slate-400">
                                                {new Date(item.last_updated).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'operations' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Log Operation Form */}
                        <div className="bg-[#162032] rounded-lg border border-[#27354f] p-6">
                            <h2 className="text-xl font-bold mb-6">Log Warehouse Operation</h2>
                            <form onSubmit={handleWarehouseOperation} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Operation Type</label>
                                    <select
                                        value={operationForm.operation_type}
                                        onChange={(e) => setOperationForm({...operationForm, operation_type: e.target.value})}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                        required
                                    >
                                        <option value="picking">Picking</option>
                                        <option value="shelving">Shelving</option>
                                        <option value="counting">Counting</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">Product ID</label>
                                    <input
                                        type="number"
                                        value={operationForm.product_id}
                                        onChange={(e) => setOperationForm({...operationForm, product_id: e.target.value})}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Enter product ID"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">Quantity</label>
                                    <input
                                        type="number"
                                        value={operationForm.quantity}
                                        onChange={(e) => setOperationForm({...operationForm, quantity: e.target.value})}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Enter quantity"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">Notes (Optional)</label>
                                    <textarea
                                        value={operationForm.notes}
                                        onChange={(e) => setOperationForm({...operationForm, notes: e.target.value})}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Add any notes about this operation"
                                        rows="3"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg transition"
                                >
                                    Log Operation
                                </button>
                            </form>
                        </div>

                        {/* Recent Operations */}
                        <div className="bg-[#162032] rounded-lg border border-[#27354f] p-6">
                            <h2 className="text-xl font-bold mb-6">Recent Operations</h2>
                            <div className="space-y-3">
                                {operations.length === 0 ? (
                                    <p className="text-slate-400 text-center py-8">No operations logged yet</p>
                                ) : (
                                    operations.slice(0, 10).map((op, idx) => (
                                        <div key={idx} className="bg-[#0f172a] p-3 rounded border border-[#334155]">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-sm">{op.operation_type}</p>
                                                    <p className="text-xs text-slate-400">{op.product_name} - Qty: {op.quantity}</p>
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(op.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'transfers' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Create Transfer Form */}
                        <div className="bg-[#162032] rounded-lg border border-[#27354f] p-6">
                            <h2 className="text-xl font-bold mb-6">Request Transfer</h2>
                            <form onSubmit={handleCreateTransfer} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">From Warehouse</label>
                                    <input
                                        type="text"
                                        value={warehouses.find(w => w.warehouse_id === selectedWarehouse)?.name || ''}
                                        disabled
                                        className="w-full bg-[#0f172a] border border-[#334155] text-slate-400 px-4 py-2 rounded-lg opacity-60"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">To Warehouse</label>
                                    <select
                                        value={transferForm.to_warehouse}
                                        onChange={(e) => setTransferForm({...transferForm, to_warehouse: parseInt(e.target.value)})}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                        required
                                    >
                                        <option value="">Select destination warehouse</option>
                                        {warehouses.filter(w => w.warehouse_id !== selectedWarehouse).map(w => (
                                            <option key={w.warehouse_id} value={w.warehouse_id}>
                                                {w.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">Product ID</label>
                                    <input
                                        type="number"
                                        value={transferForm.product_id}
                                        onChange={(e) => setTransferForm({...transferForm, product_id: e.target.value})}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Enter product ID"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">Quantity</label>
                                    <input
                                        type="number"
                                        value={transferForm.quantity}
                                        onChange={(e) => setTransferForm({...transferForm, quantity: e.target.value})}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Enter quantity"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg transition"
                                >
                                    Request Transfer
                                </button>
                            </form>
                        </div>

                        {/* Transfer History */}
                        <div className="bg-[#162032] rounded-lg border border-[#27354f] p-6">
                            <h2 className="text-xl font-bold mb-6">Transfer History</h2>
                            <div className="space-y-3">
                                {transfers.length === 0 ? (
                                    <p className="text-slate-400 text-center py-8">No transfers yet</p>
                                ) : (
                                    transfers.slice(0, 10).map(transfer => (
                                        <div key={transfer.transfer_id} className="bg-[#0f172a] p-3 rounded border border-[#334155]">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm">{transfer.product_name}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {transfer.from_warehouse} → {transfer.to_warehouse} (Qty: {transfer.quantity})
                                                    </p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    transfer.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    transfer.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                    {transfer.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
