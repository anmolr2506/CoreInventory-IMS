import React from 'react';
import {
    LayoutDashboard,
    ClipboardList,
    Package,
    ArrowRightLeft,
    Settings,
    LogOut,
    User
} from 'lucide-react';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview of your inventory management system with key metrics and analytics.' },
    { id: 'operations', label: 'Operations', icon: ClipboardList, description: 'Manage all incoming receipts, outgoing deliveries, and internal transfers.' },
    {
        id: 'stock',
        label: 'Products',
        icon: Package,
        description: 'Create and update products, categories, stock by location, and reorder rules.',
        hoverFeatures: [
            'Create and update products',
            'Name, SKU/Code, Category, Unit of Measure',
            'Initial stock (optional)',
            'Stock availability per location',
            'Product categories',
            'Reordering rules'
        ]
    },
    { id: 'move-history', label: 'Move History', icon: ArrowRightLeft, description: 'Track all product movements including transfers, receipts, and deliveries.' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Configure system preferences, user roles, and notification settings.' },
];

const Sidebar = ({ username, activeItem = 'dashboard', onNavigate, onLogout }) => {

    const handleNavClick = (item) => {
        if (onNavigate) {
            onNavigate(item.id);
        }
    };

    return (
        <div className="w-64 min-h-screen bg-[#0f172a] border-r border-[#1e293b] flex flex-col justify-between p-4 flex-shrink-0">
            {/* Logo */}
            <div>
                <div className="flex items-center space-x-3 px-3 py-4 mb-6">
                    <div className="p-2 bg-cyan-500 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-extrabold text-white tracking-tight">Core Inventory</h1>
                        <p className="text-xs text-slate-500 font-medium">Admin Panel</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === activeItem;
                        return (
                            <div key={item.id} className="relative group/nav">
                                <button
                                    onClick={() => handleNavClick(item)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group ${
                                        isActive
                                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                                            : 'text-slate-400 hover:bg-[#1e293b]/60 hover:text-white border border-transparent hover:border-[#334155]/50'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-cyan-400' : ''}`} />
                                    <span>{item.label}</span>
                                </button>

                                {item.hoverFeatures ? (
                                    <div className="pointer-events-none invisible absolute left-[calc(100%+8px)] top-1/2 z-30 w-72 -translate-y-1/2 rounded-xl border border-[#334155] bg-[#101a30] p-3 text-left opacity-0 shadow-2xl transition-all duration-200 group-hover/nav:visible group-hover/nav:opacity-100">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">Products Features</p>
                                        <ul className="space-y-1 text-xs text-slate-300">
                                            {item.hoverFeatures.map((feature) => (
                                                <li key={feature}>- {feature}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* User Profile */}
            <div className="border-t border-[#1e293b] pt-4 mt-4">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#1e293b]/40 transition-colors group">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white truncate max-w-[120px]">
                                {username || 'User'}
                            </p>
                            <p className="text-xs text-slate-500">Administrator</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
