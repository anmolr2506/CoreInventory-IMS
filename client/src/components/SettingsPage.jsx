import React, { useState } from 'react';
import { Settings, ChevronDown, LogOut } from 'lucide-react';
import WarehouseSettings from './WarehouseSettings.jsx';
import LocationSettings from './LocationSettings.jsx';

const SettingsPage = ({ username, onLogout }) => {
    const [activeTab, setActiveTab] = useState('warehouse'); // warehouse, location
    const [settingsOpen, setSettingsOpen] = useState(false);

    const navTabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'operations', label: 'Operations' },
        { id: 'products', label: 'Products' },
        { id: 'move-history', label: 'Move History' },
        { id: 'settings', label: 'Settings' }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#0a0f1c] text-white">
            {/* Top Navigation Bar */}
            <div className="bg-[#162032] border-b border-[#27354f] px-8 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo/Brand */}
                    <div className="text-2xl font-bold text-cyan-500">Core Inventory</div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center space-x-1">
                        {navTabs.map(tab => (
                            <div key={tab.id} className="relative group">
                                <button
                                    className={`px-6 py-3 font-semibold transition-colors ${
                                        tab.id === 'settings'
                                            ? 'text-cyan-400 border-b-2 border-cyan-400'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                    onClick={() => {
                                        if (tab.id === 'settings') {
                                            setSettingsOpen(!settingsOpen);
                                        }
                                    }}
                                >
                                    {tab.label}
                                    {tab.id === 'settings' && <ChevronDown className="inline ml-2 w-4 h-4" />}
                                </button>

                                {/* Settings Dropdown Overlay */}
                                {tab.id === 'settings' && settingsOpen && (
                                    <div className="absolute left-0 mt-0 w-56 bg-[#1a2741] border border-[#27354f] rounded-lg shadow-2xl z-50 overflow-hidden">
                                        <button
                                            onClick={() => {
                                                setActiveTab('warehouse');
                                                setSettingsOpen(false);
                                            }}
                                            className={`w-full text-left px-6 py-4 transition-colors ${
                                                activeTab === 'warehouse'
                                                    ? 'bg-cyan-600/20 text-cyan-400 border-l-3 border-cyan-400'
                                                    : 'text-slate-300 hover:bg-[#27354f]'
                                            }`}
                                        >
                                            <div className="font-semibold">Warehouse Settings</div>
                                            <div className="text-xs text-slate-500 mt-1">Manage warehouse details</div>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setActiveTab('location');
                                                setSettingsOpen(false);
                                            }}
                                            className={`w-full text-left px-6 py-4 transition-colors border-t border-[#27354f] ${
                                                activeTab === 'location'
                                                    ? 'bg-cyan-600/20 text-cyan-400 border-l-3 border-cyan-400'
                                                    : 'text-slate-300 hover:bg-[#27354f]'
                                            }`}
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
            <div className="flex-1">
                {activeTab === 'warehouse' && <WarehouseSettings />}
                {activeTab === 'location' && <LocationSettings />}
            </div>
        </div>
    );
};

export default SettingsPage;
