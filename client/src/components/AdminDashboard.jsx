import React, { useEffect, useState } from 'react';
import { LogOut, Settings, Users, Warehouse } from 'lucide-react';

const AdminDashboard = ({ username, onLogout }) => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="min-h-screen bg-[#0a0f1c] text-white">
            {/* Header */}
            <div className="bg-[#162032] border-b border-[#27354f] p-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                        <p className="text-slate-400 mt-1">Full System Access - Welcome, {username}</p>
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

            {/* Tabs */}
            <div className="max-w-7xl mx-auto p-6">
                <div className="flex space-x-4 mb-6 border-b border-[#27354f]">
                    {[
                        { id: 'overview', label: 'Overview', icon: Settings },
                        { id: 'users', label: 'Manage Users', icon: Users },
                        { id: 'warehouses', label: 'Manage Warehouses', icon: Warehouse }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 font-semibold transition flex items-center space-x-2 ${
                                activeTab === tab.id
                                    ? 'text-cyan-500 border-b-2 border-cyan-500'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="bg-[#162032] rounded-lg border border-[#27354f] p-8">
                            <h2 className="text-2xl font-bold mb-6">System Overview</h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="bg-[#0f172a] p-6 rounded-lg border border-[#334155]">
                                    <h3 className="text-lg font-semibold text-cyan-400 mb-2">Total Features</h3>
                                    <p className="text-3xl font-bold">6</p>
                                    <p className="text-sm text-slate-400 mt-2">Role-based access control, Inventory management, Transfers, Approvals, Audit logs, Staff operations</p>
                                </div>
                                <div className="bg-[#0f172a] p-6 rounded-lg border border-[#334155]">
                                    <h3 className="text-lg font-semibold text-green-400 mb-2">Active Roles</h3>
                                    <p className="text-3xl font-bold">3</p>
                                    <p className="text-sm text-slate-400 mt-2">Admin, Manager, Staff with specific permissions</p>
                                </div>
                                <div className="bg-[#0f172a] p-6 rounded-lg border border-[#334155]">
                                    <h3 className="text-lg font-semibold text-purple-400 mb-2">Approval Workflow</h3>
                                    <p className="text-3xl font-bold">Active</p>
                                    <p className="text-sm text-slate-400 mt-2">Staff request → Manager approve → Execute</p>
                                </div>
                            </div>

                            <div className="mt-8 bg-[#0f172a] p-6 rounded-lg border border-[#334155]">
                                <h3 className="text-lg font-semibold mb-4">System Features</h3>
                                <ul className="space-y-3">
                                    <li className="flex items-center space-x-3">
                                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                                        <span><strong>Inventory Management:</strong> Track products across warehouses with real-time updates</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                                        <span><strong>Receipt Management:</strong> Log incoming stock, pending manager approval</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                                        <span><strong>Delivery Management:</strong> Track outgoing stock with approval workflow</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                                        <span><strong>Warehouse Transfers:</strong> Move stock between warehouses with authorization</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                                        <span><strong>Staff Operations:</strong> Picking, shelving, counting with audit trails</span>
                                    </li>
                                    <li className="flex items-center space-x-3">
                                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                                        <span><strong>Audit Logging:</strong> Complete operation history with user tracking</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-[#162032] rounded-lg border border-[#27354f] p-6">
                        <h2 className="text-xl font-bold mb-6">Manage Users</h2>
                        <div className="bg-[#0f172a] p-8 rounded-lg border border-[#334155] text-center">
                            <p className="text-slate-400 mb-4">User management interface coming soon</p>
                            <p className="text-sm text-slate-500">You can manage users through direct database queries or API endpoints</p>
                            <div className="mt-6 bg-[#162032] p-4 rounded border border-[#27354f] text-left">
                                <p className="text-sm font-semibold mb-3">API Reference:</p>
                                <code className="text-xs text-cyan-400">
                                    POST /signup - Create user (with role and warehouse assignment)
                                </code>
                            </div>
                        </div>
                    </div>
                )}

                {/* Warehouses Tab */}
                {activeTab === 'warehouses' && (
                    <div className="bg-[#162032] rounded-lg border border-[#27354f] p-6">
                        <h2 className="text-xl font-bold mb-6">Manage Warehouses</h2>
                        <div className="bg-[#0f172a] p-8 rounded-lg border border-[#334155] text-center">
                            <p className="text-slate-400 mb-4">Warehouse management interface coming soon</p>
                            <p className="text-sm text-slate-500">You can manage warehouses through database queries</p>
                            <div className="mt-6 bg-[#162032] p-4 rounded border border-[#27354f] text-left">
                                <p className="text-sm font-semibold mb-3">Available Operations:</p>
                                <ul className="text-xs text-cyan-400 space-y-1">
                                    <li>• Create new warehouses</li>
                                    <li>• Assign staff to warehouses</li>
                                    <li>• View warehouse inventory</li>
                                    <li>• Generate reports</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
