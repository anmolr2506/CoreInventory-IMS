import React, { useEffect, useState, useCallback } from 'react';
import {
    Search, LayoutGrid, LayoutList, Plus, Package, ChevronLeft
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const OperationsScreen = ({ type, title, subtitle, accentColor, onNewClick, onBack }) => {
    const isReceipt = type === 'receipt';
    const endpoint = isReceipt ? '/api/receipts' : '/api/deliveries';
    const statusColumns = isReceipt
        ? ['Pending', 'In Transit', 'Received']
        : ['Pending', 'Processing', 'Shipped', 'Delivered'];

    const [data, setData] = useState([]);
    const [kanbanData, setKanbanData] = useState({});
    const [view, setView] = useState('table'); // 'table' | 'kanban'
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.set('view', view);
            if (search.trim()) params.set('search', search.trim());
            const res = await fetch(`${API_BASE}${endpoint}?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.view === 'kanban') {
                setKanbanData(json.data || {});
                setData([]);
            } else {
                setData(json.data || []);
                setKanbanData({});
            }
        } catch (err) {
            console.error(err);
            setData([]);
            setKanbanData({});
        } finally {
            setLoading(false);
        }
    }, [endpoint, view, search]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearchSubmit = (e) => {
        e?.preventDefault();
        setSearch(searchInput);
    };

    return (
        <div className="flex-1 bg-[#0a0f1c] overflow-y-auto animate-[fade-in_0.5s_ease-out]">
            {/* Top bar with back */}
            <div className="sticky top-0 z-30 bg-[#0a0f1c]/80 backdrop-blur-xl border-b border-[#1e293b] px-8 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 rounded-xl bg-[#1e293b]/60 border border-[#334155]/50 text-slate-400 hover:text-white hover:bg-[#1e293b] transition-all cursor-pointer"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="relative w-full max-w-lg">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <form onSubmit={handleSearchSubmit}>
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder={`Search ${title.toLowerCase()}...`}
                                    className="w-full pl-11 pr-4 py-2.5 bg-[#1e293b]/60 border border-[#334155]/50 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                                />
                            </form>
                        </div>
                    </div>
                    <button
                        onClick={onNewClick}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Operation</span>
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="px-8 py-6">
                <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => onNewClick?.()}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm ${accentColor} ${isReceipt ? 'bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20'} transition-all cursor-pointer`}
                            >
                                <Plus className="w-4 h-4" />
                                Create New
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-white">{title}</h2>
                                <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearchSubmit} className="flex">
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search..."
                                    className="pl-3 pr-10 py-2 bg-[#1e293b]/60 border border-[#334155]/50 rounded-l-xl text-sm text-slate-300 w-48 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                />
                                <button
                                    type="submit"
                                    className="p-2 bg-[#1e293b] border border-l-0 border-[#334155]/50 rounded-r-xl text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            </form>
                            <button
                                onClick={() => setView(view === 'table' ? 'kanban' : 'table')}
                                className="p-2.5 rounded-xl bg-[#1e293b]/60 border border-[#334155]/50 text-slate-400 hover:text-white hover:bg-[#1e293b] transition-all cursor-pointer"
                                title={view === 'table' ? 'Switch to Kanban view' : 'Switch to Table view'}
                            >
                                {view === 'table' ? (
                                    <LayoutGrid className="w-5 h-5" />
                                ) : (
                                    <LayoutList className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                        </div>
                    ) : view === 'table' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#334155]/50">
                                        <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Reference</th>
                                        <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Product</th>
                                        {isReceipt ? (
                                            <>
                                                <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Supplier</th>
                                                <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Warehouse</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Customer</th>
                                                <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Warehouse</th>
                                            </>
                                        )}
                                        <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Quantity</th>
                                        <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Status</th>
                                        <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-500">
                                                No {title.toLowerCase()}s found.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.map((row) => (
                                            <tr key={row.receipt_id || row.delivery_id} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition-colors">
                                                <td className="py-4 px-4">
                                                    <span className="text-cyan-400 font-mono text-sm">{row.reference_number || '—'}</span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                                                            <Package className="w-4 h-4 text-cyan-400" />
                                                        </div>
                                                        <div>
                                                            <span className="text-white font-medium">{row.product_name}</span>
                                                            <span className="text-slate-500 text-xs block">{row.sku}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {isReceipt ? (
                                                    <>
                                                        <td className="py-4 px-4 text-slate-300">{row.supplier_name}</td>
                                                        <td className="py-4 px-4 text-slate-300">{row.warehouse_name}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="py-4 px-4 text-slate-300">{row.customer_name}</td>
                                                        <td className="py-4 px-4 text-slate-300">{row.warehouse_name}</td>
                                                    </>
                                                )}
                                                <td className="py-4 px-4 text-slate-300">{row.quantity} {row.unit}</td>
                                                <td className="py-4 px-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                        (row.status || (isReceipt ? 'Received' : 'Delivered')) === (isReceipt ? 'Received' : 'Delivered')
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : (row.status || '').includes('Pending')
                                                                ? 'bg-amber-500/20 text-amber-400'
                                                                : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                        {row.status || (isReceipt ? 'Received' : 'Delivered')}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-slate-500 text-xs">
                                                    {new Date(row.received_at || row.delivered_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {statusColumns.map((status) => (
                                <div
                                    key={status}
                                    className="bg-[#1e293b]/30 border border-[#334155]/50 rounded-xl p-4 min-h-[200px]"
                                >
                                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{status}</h4>
                                    <div className="space-y-3">
                                        {(kanbanData[status] || []).map((row) => (
                                            <div
                                                key={row.receipt_id || row.delivery_id}
                                                className="p-3 bg-[#111827] border border-[#334155]/30 rounded-lg"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <Package className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-white font-medium text-sm">{row.product_name}</p>
                                                        <p className="text-slate-500 text-xs mt-0.5">
                                                            {isReceipt ? row.supplier_name : row.customer_name} · {row.quantity} {row.unit}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(kanbanData[status] || []).length === 0 && (
                                            <p className="text-slate-600 text-sm py-4">No items</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OperationsScreen;
