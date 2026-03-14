import React from "react";
import ApprovalRequests from "./ApprovalRequests.jsx";

const SettingsScreen = ({ username, userRole }) => {
    const canApproveUsers = userRole === "manager" || userRole === "admin";

    return (
        <div className="flex-1 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">Profile & Settings</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Manage your profile and, if eligible, approve new staff.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#162032] border border-[#27354f] rounded-2xl p-6">
                        <h3 className="text-white font-bold text-lg">Profile</h3>
                        <div className="mt-4 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Name</span>
                                <span className="text-white font-semibold">{username || "User"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Role</span>
                                <span className="text-white font-semibold">{(userRole || "staff").toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#162032] border border-[#27354f] rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-[#27354f]">
                            <h3 className="text-white font-bold text-lg">Approvals</h3>
                            <p className="text-slate-400 text-sm mt-1">
                                {canApproveUsers
                                    ? "Review pending signup requests."
                                    : "Only managers and admins can approve users."}
                            </p>
                        </div>

                        {canApproveUsers ? (
                            <ApprovalRequests username={username} userRole={userRole} />
                        ) : (
                            <div className="p-6 text-slate-400 text-sm">
                                You don’t have approval permissions.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsScreen;

