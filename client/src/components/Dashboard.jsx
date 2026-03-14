import React, { useEffect, useState } from 'react';
import {
    TrendingUp, TrendingDown, Package, Activity, Clock,
    AlertCircle, CheckCircle2, ArrowDownLeft, ArrowUpRight,
    Bell, Plus, Search, HelpCircle, ShieldCheck
} from 'lucide-react';

const Dashboard = ({ username, onNavigate }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5000/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                setStats(data);
            } catch (err) {
                console.error('Failed to fetch dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const openDetailTab = (title, description) => {
        const pageContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title} - Core Inventory</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                        background: #0a0f1c;
                        color: #e2e8f0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        padding: 2rem;
                    }
                    .container {
                        max-width: 600px;
                        text-align: center;
                        background: #162032;
                        border: 1px solid #27354f;
                        border-radius: 1rem;
                        padding: 3rem;
                        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                    }
                    h1 { font-size: 2rem; font-weight: 800; margin-bottom: 1rem; color: white; }
                    p { color: #94a3b8; line-height: 1.6; font-size: 1.1rem; }
                    .badge {
                        display: inline-block;
                        margin-top: 1.5rem;
                        padding: 0.5rem 1.5rem;
                        background: #0e7490;
                        border-radius: 2rem;
                        font-size: 0.85rem;
                        color: #cffafe;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>${title}</h1>
                    <p>${description}</p>
                    <span class="badge">Core Inventory Detail</span>
                </div>
            </body>
            </html>
        `;
        const blob = new Blob([pageContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0a0f1c]">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const s = stats || {};

    return (
        <div className="flex-1 bg-[#0a0f1c] overflow-y-auto animate-[fade-in_0.6s_ease-out]">
            {/* Top Bar */}
            <div className="sticky top-0 z-30 bg-[#0a0f1c]/80 backdrop-blur-xl border-b border-[#1e293b] px-8 py-4">
                <div className="flex items-center justify-between">
                    {/* Search */}
                    <div className="relative w-full max-w-lg">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search inventory, products, or operations..."
                            className="w-full pl-11 pr-4 py-2.5 bg-[#1e293b]/60 border border-[#334155]/50 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                        />
                    </div>

                    <div className="flex items-center space-x-3 ml-4">
                        {/* Notification Bell */}
                        <button className="relative p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#334155]/30 text-slate-400 hover:text-white hover:bg-[#1e293b] transition-all cursor-pointer">
                            <Bell className="w-5 h-5" />
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0a0f1c]" />
                        </button>

                        {/* New Operation Button */}
                        <button
                            onClick={() => onNavigate ? onNavigate('/operation/new') : openDetailTab('New Operation', 'Create a new receipt, delivery, or transfer operation to manage your inventory flow.')}
                            className="flex items-center space-x-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New Operation</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-8 py-6 space-y-6">
                {/* Header */}
                <h2 className="text-2xl font-bold text-white">Overview</h2>

                {/* Top Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Package className="w-5 h-5" />}
                        iconColor="text-cyan-400"
                        iconBg="bg-cyan-500/10"
                        value={s.totalItems?.toLocaleString() || '0'}
                        label="Total Items"
                        trend="+12%"
                        trendUp={true}
                        onClick={() => openDetailTab('Total Items', `Your inventory currently holds ${s.totalItems?.toLocaleString() || 0} items across all warehouses and categories.`)}
                    />
                    <StatCard
                        icon={<Activity className="w-5 h-5" />}
                        iconColor="text-purple-400"
                        iconBg="bg-purple-500/10"
                        value={s.totalOperations?.toLocaleString() || '0'}
                        label="Operations"
                        trend="+8%"
                        trendUp={true}
                        onClick={() => openDetailTab('Operations', `There have been ${s.totalOperations?.toLocaleString() || 0} total operations recorded in the system including receipts, deliveries, and transfers.`)}
                    />
                    <StatCard
                        icon={<AlertCircle className="w-5 h-5" />}
                        iconColor="text-amber-400"
                        iconBg="bg-amber-500/10"
                        value={s.lowStockCount?.toString() || '0'}
                        label="Low Stock"
                        trend={`-${Math.max(1, Math.floor(Math.random() * 5))}%`}
                        trendUp={false}
                        onClick={() => openDetailTab('Low Stock Alert', `${s.lowStockCount || 0} products are currently at or below their reorder level and need attention.`)}
                    />
                    <StatCard
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        iconColor="text-emerald-400"
                        iconBg="bg-emerald-500/10"
                        value={`${s.fulfillmentRate || 0}%`}
                        label="Fulfillment"
                        trend="+2.4%"
                        trendUp={true}
                        onClick={() => openDetailTab('Fulfillment Rate', `Current fulfillment rate is ${s.fulfillmentRate || 0}%, representing the ratio of completed deliveries to total operations.`)}
                    />
                </div>

                {/* Receipt & Delivery Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Receipt - Incoming */}
                    <div
                        onClick={() => onNavigate ? onNavigate('/receipt') : openDetailTab('Incoming Receipts', `Track all incoming inventory. ${s.incoming?.itemsToReceive || 0} items received this week, ${s.incoming?.late || 0} overdue, ${s.incoming?.totalOperations || 0} total receipt operations.`)}
                        className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] transition-all duration-300 cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
                                    <ArrowDownLeft className="w-3.5 h-3.5" /> INCOMING
                                </span>
                                <h3 className="text-2xl font-bold text-white mt-1">Receipt</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Track all incoming inventory</p>
                            </div>
                            <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                            </div>
                        </div>

                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mb-4">
                            <span className="text-3xl font-bold text-emerald-400">{s.incoming?.itemsToReceive || 0}</span>
                            <span className="text-sm text-slate-400 ml-2">Items to receive</span>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-rose-400 font-semibold">{s.incoming?.late || 0}</span>
                                <span className="text-slate-500">Late</span>
                            </div>
                            <div>
                                <span className="text-cyan-400 font-semibold">{s.incoming?.totalOperations || 0}</span>
                                <span className="text-slate-500 ml-1.5">Total operations</span>
                            </div>
                        </div>
                    </div>

                    {/* Delivery - Outgoing */}
                    <div
                        onClick={() => onNavigate ? onNavigate('/delivery') : openDetailTab('Outgoing Deliveries', `Manage outgoing shipments. ${s.outgoing?.itemsToDeliver || 0} items delivered this week, ${s.outgoing?.late || 0} overdue, ${s.outgoing?.waiting || 0} waiting, ${s.outgoing?.totalOperations || 0} total delivery operations.`)}
                        className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(147,51,234,0.08)] transition-all duration-300 cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <span className="text-purple-400 text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
                                    <ArrowUpRight className="w-3.5 h-3.5" /> OUTGOING
                                </span>
                                <h3 className="text-2xl font-bold text-white mt-1">Delivery</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Manage outgoing shipments</p>
                            </div>
                            <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                                <ArrowUpRight className="w-5 h-5 text-purple-400" />
                            </div>
                        </div>

                        <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 mb-4">
                            <span className="text-3xl font-bold text-purple-400">{s.outgoing?.itemsToDeliver || 0}</span>
                            <span className="text-sm text-slate-400 ml-2">Items to deliver</span>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-rose-400 font-semibold">{s.outgoing?.late || 0}</span>
                                <span className="text-slate-500">Late</span>
                            </div>
                            <div>
                                <span className="text-blue-400 font-semibold">{s.outgoing?.waiting || 0}</span>
                                <span className="text-slate-500 ml-1.5">Waiting</span>
                            </div>
                            <div>
                                <span className="text-cyan-400 font-semibold">{s.outgoing?.totalOperations || 0}</span>
                                <span className="text-slate-500 ml-1.5">Operations</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6">
                    {/* Stock Status */}
                    <div
                        onClick={() => openDetailTab('Stock Status', `Stock overview: ${s.stockStatus?.categories || 0} categories, ${s.stockStatus?.lowStock || 0} products with low stock, ${s.stockStatus?.outOfStock || 0} products out of stock.`)}
                        className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)] transition-all duration-300 cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold text-white">Stock Status</h3>
                            <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                                <Package className="w-4 h-4 text-amber-400" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <MetricRow label="Categories" value={s.stockStatus?.categories || 0} color="text-slate-300" />
                            <MetricRow label="Low Stock" value={s.stockStatus?.lowStock || 0} color="text-amber-400" />
                            <MetricRow label="Out of Stock" value={s.stockStatus?.outOfStock || 0} color="text-rose-400" />
                        </div>
                    </div>

                    {/* Activity */}
                    <div
                        onClick={() => onNavigate ? onNavigate('/move-history') : openDetailTab('Activity Log', `Recent activity: ${s.activity?.today || 0} operations today, ${s.activity?.thisWeek || 0} this week, ${s.activity?.thisMonth || 0} this month.`)}
                        className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] transition-all duration-300 cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold text-white">Activity</h3>
                            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                <Activity className="w-4 h-4 text-blue-400" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <MetricRow label="Today" value={s.activity?.today || 0} color="text-slate-300" />
                            <MetricRow label="This Week" value={s.activity?.thisWeek || 0} color="text-slate-300" />
                            <MetricRow label="This Month" value={s.activity?.thisMonth || 0} color="text-slate-300" />
                        </div>
                    </div>

                    {/* Pending */}
                    <div
                        onClick={() => openDetailTab('Pending Items', `Pending overview: ${s.pending?.approvals || 0} items awaiting approval, ${s.pending?.processing || 0} being processed, ${s.pending?.completed || 0} completed recently.`)}
                        className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.08)] transition-all duration-300 cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold text-white">Pending</h3>
                            <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                                <Clock className="w-4 h-4 text-cyan-400" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <MetricRow label="Approvals" value={s.pending?.approvals || 0} color="text-amber-400" />
                            <MetricRow label="Processing" value={s.pending?.processing || 0} color="text-blue-400" />
                            <MetricRow label="Completed" value={s.pending?.completed || 0} color="text-emerald-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Help Button */}
            <button
                onClick={() => openDetailTab('Help Center', 'Welcome to Core Inventory Help. Browse documentation, FAQs, and tutorials to get the most out of your inventory management system.')}
                className="fixed bottom-6 right-6 p-3 bg-[#1e293b] border border-[#334155] rounded-full text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 shadow-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-300 cursor-pointer z-20"
            >
                <HelpCircle className="w-5 h-5" />
            </button>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon, iconColor, iconBg, value, label, trend, trendUp, onClick }) => (
    <div
        onClick={onClick}
        className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 hover:border-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.06)] transition-all duration-300 cursor-pointer group hover:-translate-y-0.5"
    >
        <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${iconBg} group-hover:scale-110 transition-transform duration-200`}>
                <span className={iconColor}>{icon}</span>
            </div>
            {trend && (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {trend}
                </span>
            )}
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
);

// Metric Row Component
const MetricRow = ({ label, value, color }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
);

export default Dashboard;
