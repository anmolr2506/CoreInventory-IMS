import React, { useState } from 'react';
import { Clock, LogOut, AlertCircle } from 'lucide-react';

const WaitingForApproval = ({ username, onLogout, createdAt }) => {
    const [showLogout, setShowLogout] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        localStorage.removeItem('is_approved');
        localStorage.removeItem('approval_status');
        onLogout();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Main Card */}
                <div className="bg-slate-700 rounded-lg shadow-2xl border border-slate-600 p-12 text-center space-y-6">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <Clock className="w-24 h-24 text-yellow-500 animate-pulse" />
                            <div className="absolute inset-0 bg-yellow-500 rounded-full blur-xl opacity-25 animate-pulse" />
                        </div>
                    </div>

                    {/* Status Message */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-white">
                            Awaiting Approval
                        </h1>
                        <p className="text-gray-300 text-lg">
                            Your account is pending approval
                        </p>
                    </div>

                    {/* User Info */}
                    <div className="bg-slate-600 rounded-lg p-6 space-y-3 border-l-4 border-cyan-500">
                        <div>
                            <p className="text-gray-400 text-sm">Username</p>
                            <p className="text-white font-semibold text-lg">{username}</p>
                        </div>
                        {createdAt && (
                            <div>
                                <p className="text-gray-400 text-sm">Signup Date</p>
                                <p className="text-white font-semibold">
                                    {new Date(createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Info Message */}
                    <div className="bg-cyan-600/20 border border-cyan-500 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="text-cyan-400 flex-shrink-0 mt-1" size={20} />
                        <div className="text-left">
                            <p className="text-cyan-200 font-semibold text-sm mb-1">
                                What's Next?
                            </p>
                            <p className="text-cyan-100 text-sm leading-relaxed">
                                A manager will review your account and approve you as a staff member. 
                                This typically takes less than 24 hours. 
                                You can safely close this window and try logging in later.
                            </p>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <div className="pt-4">
                        <button
                            onClick={() => setShowLogout(!showLogout)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                        >
                            <LogOut size={20} />
                            Logout
                        </button>
                        {showLogout && (
                            <div className="mt-4 p-4 bg-red-600/20 border border-red-500 rounded-lg">
                                <p className="text-red-200 text-sm mb-3">
                                    Are you sure you want to logout?
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleLogout}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition"
                                    >
                                        Yes, Logout
                                    </button>
                                    <button
                                        onClick={() => setShowLogout(false)}
                                        className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Note */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    Core Inventory IMS • User Approval System
                </p>
            </div>
        </div>
    );
};

export default WaitingForApproval;
