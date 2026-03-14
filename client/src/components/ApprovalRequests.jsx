import React, { useEffect, useState } from 'react';
import { Check, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const ApprovalRequests = ({ username, userRole }) => {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedAction, setSelectedAction] = useState(null);
    const [actionReason, setActionReason] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const token = localStorage.getItem('token');

    // Fetch pending approvals
    useEffect(() => {
        const fetchApprovals = async () => {
            try {
                setLoading(true);
                const response = await fetch('http://localhost:5000/approvals/pending', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setPendingRequests(data.data || []);
                }
            } catch (err) {
                console.error('Error fetching approvals:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchApprovals();
        // Refresh every 30 seconds
        const interval = setInterval(fetchApprovals, 30000);
        return () => clearInterval(interval);
    }, [token]);

    const handleApprove = async (userId, userName) => {
        try {
            const response = await fetch(`http://localhost:5000/approval/${userId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({})
            });

            if (response.ok) {
                const result = await response.json();
                setSuccessMessage(result.message);

                // Remove from list
                setPendingRequests(prev => prev.filter(r => r.user_id !== userId));

                // Clear message after 3 seconds
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Failed to approve'));
            }
        } catch (err) {
            console.error('Error approving user:', err);
            alert('Error approving user');
        }
        setSelectedAction(null);
    };

    const handleReject = async (userId, userName) => {
        try {
            const response = await fetch(`http://localhost:5000/approval/${userId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ reason: actionReason })
            });

            if (response.ok) {
                const result = await response.json();
                setSuccessMessage(result.message);

                // Remove from list
                setPendingRequests(prev => prev.filter(r => r.user_id !== userId));

                // Clear message after 3 seconds
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Failed to reject'));
            }
        } catch (err) {
            console.error('Error rejecting user:', err);
            alert('Error rejecting user');
        }
        setSelectedAction(null);
        setActionReason('');
    };

    if (loading) {
        return (
            <div className="p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" />
            </div>
        );
    }

    if (pendingRequests.length === 0) {
        return (
            <div className="p-6 text-center text-gray-400">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending approval requests</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-6">
            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-600/20 border border-green-500 rounded-lg p-3 mb-4">
                    <p className="text-green-200 text-sm font-semibold flex items-center gap-2">
                        <Check size={16} />
                        {successMessage}
                    </p>
                </div>
            )}

            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <RefreshCw size={18} className="text-cyan-500" />
                Approval Requests
                <span className="ml-auto bg-cyan-600 text-white text-xs px-2 py-1 rounded-full">
                    {pendingRequests.length}
                </span>
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingRequests.map(request => (
                    <div
                        key={request.user_id}
                        className="bg-slate-600 rounded-lg p-4 border border-slate-500 space-y-3"
                    >
                        {/* User Info */}
                        <div>
                            <p className="text-white font-semibold">{request.name}</p>
                            <p className="text-gray-400 text-sm">{request.email}</p>
                        </div>

                        {/* Role Info */}
                        <div className="flex items-center justify-between text-sm">
                            <div>
                                <span className="text-gray-400">Requesting:</span>
                                <span className="ml-2 bg-cyan-600/30 text-cyan-200 px-2 py-1 rounded text-xs font-semibold">
                                    {request.requested_role?.toUpperCase() || 'STAFF'}
                                </span>
                            </div>
                            <span className="text-gray-500 text-xs">
                                {new Date(request.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        {selectedAction === request.user_id ? (
                            <div className="space-y-3 bg-slate-500/50 p-3 rounded border border-slate-400">
                                {selectedAction === `reject-${request.user_id}` && (
                                    <textarea
                                        placeholder="Reason for rejection (optional)"
                                        value={actionReason}
                                        onChange={(e) => setActionReason(e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-500 text-white text-sm rounded p-2 focus:outline-none focus:border-cyan-500"
                                        rows="2"
                                    />
                                )}

                                <div className="flex gap-2">
                                    {selectedAction === `reject-${request.user_id}` ? (
                                        <>
                                            <button
                                                onClick={() => handleReject(request.user_id, request.name)}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded transition flex items-center justify-center gap-1"
                                            >
                                                <X size={16} />
                                                Confirm Reject
                                            </button>
                                            <button
                                                onClick={() => setSelectedAction(null)}
                                                className="flex-1 bg-slate-500 hover:bg-slate-400 text-white text-sm font-semibold py-2 rounded transition"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleApprove(request.user_id, request.name)}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded transition flex items-center justify-center gap-1"
                                            >
                                                <Check size={16} />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => setSelectedAction(`reject-${request.user_id}`)}
                                                className="flex-1 bg-red-600/70 hover:bg-red-600 text-white text-sm font-semibold py-2 rounded transition flex items-center justify-center gap-1"
                                            >
                                                <X size={16} />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => setSelectedAction(null)}
                                                className="px-3 bg-slate-500 hover:bg-slate-400 text-white text-sm font-semibold py-2 rounded transition"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedAction(request.user_id)}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded transition flex items-center justify-center gap-1"
                                >
                                    <Check size={14} />
                                    Approve
                                </button>
                                <button
                                    onClick={() => setSelectedAction(`reject-${request.user_id}`)}
                                    className="flex-1 bg-red-600/70 hover:bg-red-600 text-white text-sm font-semibold py-2 rounded transition flex items-center justify-center gap-1"
                                >
                                    <X size={14} />
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ApprovalRequests;
