import React, { useState, useEffect } from 'react';
import { getAllRequests, updateRequestStatus } from '../services/api';
import { FiFileText, FiClock, FiCheckCircle, FiXCircle, FiSearch } from 'react-icons/fi';
import './Requests.css'; // Import the new Premium CSS

const Requests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING'); // PENDING | APPROVED | REJECTED

    useEffect(() => {
        loadRequests();
    }, [filter]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            // Determine Branch Context based on Role
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = user.role || '';
            const userBranchId = user.branchId;

            // Define Admin Roles (can see everything)
            const allowedAdminRoles = ['HR', 'SUPER_ADMIN', 'ADMIN'];

            let queryBranchId = null;

            // If NOT an admin role, enforce branch isolation
            if (!allowedAdminRoles.includes(userRole)) {
                if (userBranchId) {
                    queryBranchId = userBranchId;
                }
            }

            const data = await getAllRequests(filter, queryBranchId);

            let filteredRequests = data.requests || [];

            // sort by date desc
            const sorted = filteredRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRequests(sorted);
        } catch (error) {
            console.error('Failed to load requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, currentStatus, actionType) => {
        let status = actionType; // Default to the action (APPROVED/REJECTED)
        let rejectionReason = null;

        if (actionType === 'REJECTED') {
            rejectionReason = prompt('Enter rejection reason (optional):');
            if (rejectionReason === null) return;
        } else if (actionType === 'APPROVED') {
            // Determine next status based on current status and role
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const role = user.role;

            // Managers recommending approval moves to PENDING_HR
            // HR/Admin finalizes approval
            const managerRoles = ['BRANCH_MANAGER', 'CLUSTER_MANAGER', 'RETAIL_MANAGER'];
            if (currentStatus === 'PENDING_MANAGER' && managerRoles.includes(role)) {
                status = 'PENDING_HR';
            } else {
                status = 'APPROVED';
            }
        }

        if (!window.confirm(`Are you sure you want to ${status === 'PENDING_HR' ? 'Recommend' : actionType.toLowerCase()} this request?`)) return;

        try {
            // Pass user ID as actionBy
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await updateRequestStatus(requestId, status, rejectionReason);
            // Note: API updated to accept actionBy in body, need to check if updateRequestStatus service supports it
            loadRequests();
        } catch (error) {
            alert('Failed to update request status');
        }
    };

    return (
        <div className="page-container fade-in">
            <div className="section-header">
                <div className="section-title">
                    <FiSearch />
                    <h2>Request Management</h2>
                </div>
                <div className="search-container">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '8px' }}>Status Filter:</span>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <p>Loading requests...</p>
            ) : requests.length === 0 ? (
                <div className="empty-state">No {filter.toLowerCase()} requests found.</div>
            ) : (
                <div className="requests-grid">
                    {requests.map((req) => (
                        <div key={req.requestId} className={`request-card type-${req.type.toLowerCase()}`}>
                            <div className="card-header">
                                <span className={`request-badge badge-${req.type.toLowerCase()}`}>
                                    {req.type}
                                </span>
                                <span className={`status-badge status-${req.status.toLowerCase()}`}>
                                    {req.status}
                                </span>
                            </div>

                            <div className="employee-info">
                                <h3>{req.employeeName || req.employeeId}</h3>
                                <div className="employee-meta">
                                    <span>{req.department}</span>
                                    {req.branchId && (
                                        <>
                                            <span>•</span>
                                            <span>{req.branchId}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="detail-box">
                                {req.type === 'ADVANCE' && (
                                    <>
                                        <div className="detail-row">
                                            <span className="label">Amount</span>
                                            <span className="value">₹{req.data?.amount}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">EMI Plan</span>
                                            <span className="value">{req.data?.emiMonths} Months</span>
                                        </div>
                                    </>
                                )}
                                {(req.type === 'LEAVE' || req.type === 'PERMISSION') && (
                                    <>
                                        <div className="detail-row">
                                            <span className="label">Date</span>
                                            <span className="value">{req.data?.date}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">Reason</span>
                                            <span className="value">{req.data?.reason}</span>
                                        </div>
                                        {req.type === 'PERMISSION' && (
                                            <div className="detail-row">
                                                <span className="label">Duration</span>
                                                <span className="value">{req.data?.duration} mins</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                {req.type === 'BRANCH_TRAVEL' && (
                                    <>
                                        <div className="detail-row">
                                            <span className="label">Date</span>
                                            <span className="value">{req.data?.date}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">Destination</span>
                                            <span className="value">{req.data?.destination}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">Reason</span>
                                            <span className="value">{req.data?.reason}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {['PENDING', 'PENDING_MANAGER', 'PENDING_HR'].includes(req.status) && (
                                <div className="action-buttons">
                                    <button
                                        className="btn-action btn-approve"
                                        onClick={() => handleAction(req.requestId, req.status, 'APPROVED')}
                                    >
                                        {req.status === 'PENDING_MANAGER' ? 'Recommend' : 'Approve'}
                                    </button>
                                    <button
                                        className="btn-action btn-reject"
                                        onClick={() => handleAction(req.requestId, req.status, 'REJECTED')}
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}

                            {req.status === 'REJECTED' && req.rejectionReason && (
                                <div className="rejection-note">
                                    Note: {req.rejectionReason}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


export default Requests;
