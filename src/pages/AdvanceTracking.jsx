import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAllRequests, updateRequestStatus, getEmployees, getBranches, getPayGroups } from '../services/api';
import { 
    FiCheck, FiX, FiAlertCircle, FiClock, FiDollarSign, 
    FiFileText, FiFilter, FiUser, FiCalendar, FiPieChart,
    FiChevronRight, FiChevronLeft, FiExternalLink, FiSearch, 
    FiTrendingUp, FiMapPin, FiMap
} from 'react-icons/fi';
import './AdvanceTracking.css';

const AdvanceTracking = () => {
    const { tab } = useParams();
    const navigate = useNavigate();
    
    const [requestSubTab, setRequestSubTab] = useState('PENDING'); // 'PENDING', 'REJECTED', 'APPROVED'
    const [activeTab, setActiveTab] = useState(tab || 'requests');
    
    const [allRequests, setAllRequests] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [payGroups, setPayGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters for Reports
    const [filters, setFilters] = useState({
        branch: '',
        paygroup: '',
        type: '', // '', 'ADVANCE', 'BRANCH_TRAVEL'
        search: ''
    });

    // Detail view for EMI
    const [selectedEmi, setSelectedEmi] = useState(null);

    // Helper to get branch name
    const getBranchName = (idOrName) => {
        if (!idOrName) return 'N/A';
        const branch = (branches || []).find(b => b.branchId === idOrName || b.name === idOrName);
        let name = branch ? branch.name : idOrName;
        // Strip SRM- prefix and anything in brackets/parens
        return name.replace(/^SRM[- ]?/, '').split('[')[0].split('(')[0].trim();
    };

    // Helper to format name
    const formatName = (name) => {
        if (!name) return 'N/A';
        return name.replace(' null', '').trim();
    };

    // Filtered Data Logic
    const trackingRequests = (allRequests || []).filter(r => ['ADVANCE', 'BRANCH_TRAVEL', 'LEAVE', 'PERMISSION'].includes(r.type));

    const pendingRequests = trackingRequests.filter(r => 
        ['PENDING', 'PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_SUPER_ADMIN'].includes(r.status)
    );
    
    const rejectedRequests = trackingRequests.filter(r => r.status === 'REJECTED');
    const approvedAdvances = trackingRequests.filter(r => r.status === 'APPROVED');

    // Reports Logic
    const reportData = approvedAdvances.filter(adv => {
        const advEmpId = adv.employeeId?.toString().trim().toLowerCase();
        const emp = (employees || []).find(e => e.employeeId?.toString().trim().toLowerCase() === advEmpId);
        
        const matchesBranch = !filters.branch || emp?.branchId === filters.branch;
        const matchesPaygroup = !filters.paygroup || emp?.paygroup === filters.paygroup;
        const matchesType = !filters.type || adv.type === filters.type;
        const dateStr = new Date(adv.updatedAt || adv.createdAt).toLocaleDateString();
        const matchesSearch = !filters.search || 
            emp?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
            adv.employeeId?.toString().toLowerCase().includes(filters.search.toLowerCase()) ||
            dateStr.includes(filters.search);
        
        return matchesBranch && matchesPaygroup && matchesType && matchesSearch;
    });

    const totalAdvance = reportData.reduce((sum, adv) => sum + (Number(adv.data?.amount) || 0), 0);

    // Day-wise report aggregation
    const dayWiseData = reportData.reduce((acc, adv) => {
        const dateObj = new Date(adv.updatedAt || adv.createdAt);
        if (isNaN(dateObj.getTime())) return acc;
        const isoDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        acc[isoDate] = (acc[isoDate] || 0) + (Number(adv.data?.amount) || 0);
        return acc;
    }, {});

    const sortedDates = Object.keys(dayWiseData).sort((a,b) => new Date(b) - new Date(a));

    useEffect(() => {
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [tab]);

    useEffect(() => {
        // Auto-select first EMI plan if none selected
        if (activeTab === 'emi' && !selectedEmi) {
            const firstEmi = approvedAdvances.find(adv => adv.type === 'ADVANCE');
            if (firstEmi) setSelectedEmi(firstEmi);
        }
    }, [activeTab, approvedAdvances, selectedEmi]);

    useEffect(() => {
        loadInitialData();
        const interval = setInterval(loadInitialData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [reqRes, empRes, branchRes, pgRes] = await Promise.all([
                getAllRequests(),
                getEmployees(),
                getBranches(),
                getPayGroups()
            ]);
            
            setAllRequests(reqRes.requests || []);
            setEmployees(empRes.employees || []);
            setBranches(branchRes.branches || []);
            setPayGroups(pgRes.payGroups || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, status) => {
        let rejectionReason = null;
        if (status === 'REJECTED') {
            rejectionReason = prompt('Enter reason for rejection:');
            if (rejectionReason === null) return;
        }

        if (!window.confirm(`Are you sure you want to ${status === 'APPROVED' ? 'Approve' : 'Reject'} this request?`)) return;

        try {
            await updateRequestStatus(requestId, status, rejectionReason);
            alert(status === 'APPROVED' ? 'Request approved.' : 'Request rejected.');
            loadInitialData();
        } catch (error) {
            alert('Failed to update request status');
        }
    };

    const generateSchedule = (amount, months, approvedAt) => {
        const schedule = [];
        const emiAmount = Math.ceil(amount / months);
        let current = new Date(approvedAt || Date.now());

        for (let i = 1; i <= months; i++) {
            current = new Date(current.setMonth(current.getMonth() + 1));
            let displayAmount = emiAmount;
            if (i === months) displayAmount = amount - (emiAmount * (months - 1));

            schedule.push({
                month: current.toLocaleString('default', { month: 'long', year: 'numeric' }),
                amount: displayAmount,
                isPast: current < new Date()
            });
        }
        return schedule;
    };

    const handleDownload = () => {
        if (!reportData || reportData.length === 0) {
            alert("No data available to download.");
            return;
        }

        const headers = ["Employee ID", "Employee Name", "Amount", "EMI (Months)", "Date", "Reason", "Status"];
        const rows = reportData.map(adv => [
            adv.employeeId,
            adv.employeeName,
            adv.data?.amount,
            adv.data?.emiMonths,
            new Date(adv.updatedAt || adv.createdAt).toLocaleDateString(),
            `"${(adv.data?.reason || "").replace(/"/g, '""')}"`,
            adv.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `advance_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div className="flex-center-center min-h-400">
            <div className="spinner"></div>
        </div>
    );

    return (
        <div className="advance-tracking-page animate-fade-in">
            <div className="page-header">
                <div className="header-title-area">
                    <FiDollarSign className="header-icon" />
                    <div>
                        <h1 className="page-title">
                            Advance {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </h1>
                        <p className="page-subtitle">
                            {activeTab === 'requests' && "Review and approve employee advance applications."}
                            {activeTab === 'reports' && "Analyze disbursement and recovery analytics."}
                            {activeTab === 'emi' && "Monitor ongoing EMI repayment schedules."}
                        </p>
                    </div>
                </div>
            </div>

            {/* TAB CONTENT: REQUESTS */}
            {activeTab === 'requests' && (
                <div className="tab-content">
                    <div className="sub-tabs-container">
                        <div className="sub-tabs">
                            <button 
                                className={`sub-tab ${requestSubTab === 'PENDING' ? 'active' : ''}`}
                                onClick={() => setRequestSubTab('PENDING')}
                            >
                                Pending Actions ({pendingRequests.length})
                            </button>
                            <button 
                                className={`sub-tab ${requestSubTab === 'APPROVED' ? 'active' : ''}`}
                                onClick={() => setRequestSubTab('APPROVED')}
                            >
                                Approved ({approvedAdvances.length})
                            </button>
                            <button 
                                className={`sub-tab ${requestSubTab === 'REJECTED' ? 'active' : ''}`}
                                onClick={() => setRequestSubTab('REJECTED')}
                            >
                                Rejected ({rejectedRequests.length})
                            </button>
                        </div>
                    </div>

                    <div className="requests-grid mt-6">
                        {((requestSubTab === 'PENDING' ? pendingRequests : (requestSubTab === 'APPROVED' ? approvedAdvances : rejectedRequests))).length === 0 ? (
                            <div className="empty-state">
                                <FiCheck className="empty-icon" />
                                <h3>No {requestSubTab.toLowerCase()} requests</h3>
                                <p>All caught up!</p>
                            </div>
                        ) : (
                                (requestSubTab === 'PENDING' ? pendingRequests : (requestSubTab === 'APPROVED' ? approvedAdvances : rejectedRequests)).map(req => (
                                <div key={req.requestId} className={`request-card ${req.status === 'APPROVED' ? 'border-l-4 border-l-green-500' : (req.status === 'REJECTED' ? 'border-l-4 border-l-red-500' : '')}`}>
                                    <div className="request-card-header">
                                        <div className="employee-info">
                                            <h3>{formatName(req.employeeName) || req.employeeId}</h3>
                                            <span>{req.department} • {getBranchName(req.branchId)}</span>
                                        </div>
                                        <div className="amount-badge">
                                            {req.type === 'ADVANCE' ? `₹${(req.data?.amount || 0).toLocaleString()}` : 
                                             req.type === 'LEAVE' ? 'LEAVE' : 
                                             req.type === 'PERMISSION' ? 'PERMISSION' : 'TRAVEL'}
                                        </div>
                                    </div>
                                    <div className="request-details">
                                        <div className="detail-item">
                                            <FiClock className="detail-icon" />
                                            <span>Requested: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        {req.type === 'ADVANCE' ? (
                                            <div className="detail-item">
                                                <FiCalendar className="detail-icon" />
                                                <span>EMI: <strong>{req.data?.emiMonths} Months</strong></span>
                                            </div>
                                        ) : req.type === 'LEAVE' ? (
                                            <div className="detail-item">
                                                <FiFileText className="detail-icon" />
                                                <span>Type: <strong>{req.data?.leaveType || 'General'}</strong></span>
                                            </div>
                                        ) : req.type === 'PERMISSION' ? (
                                            <div className="detail-item">
                                                <FiClock className="detail-icon" />
                                                <span>Duration: <strong>{req.data?.duration} mins</strong></span>
                                            </div>
                                        ) : (
                                            <div className="detail-item">
                                                <FiMapPin className="detail-icon" />
                                                <span>Destination: <strong>{getBranchName(req.data?.destination)}</strong></span>
                                            </div>
                                        )}
                                        <div className="status-row mt-2">
                                            <span className={`status-text-badge ${(req.status || 'PENDING').toLowerCase()}`}>
                                                {(req.status || 'PENDING').replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div className="reason-box">
                                            <p className="reason-label">Reason</p>
                                            <p className="reason-text">{req.data?.reason || "No reason provided."}</p>
                                        </div>
                                        {req.status === 'REJECTED' && req.rejectionReason && (
                                            <div className="rejection-box mt-3 p-3 text-sm text-red-700">
                                                <strong>Rejection Reason:</strong> {req.rejectionReason}
                                            </div>
                                        )}
                                    </div>
                                    {requestSubTab === 'PENDING' && (
                                        <div className="request-actions">
                                            <button className="btn-action btn-approve" onClick={() => handleAction(req.requestId, 'APPROVED')}><FiCheck /> Approve</button>
                                            <button className="btn-action btn-reject" onClick={() => handleAction(req.requestId, 'REJECTED')}><FiX /> Reject</button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: REPORTS */}
            {activeTab === 'reports' && (
                <div className="tab-content">
                    <div className="reports-filters bg-white border-1">
                        <div className="filters-grid">
                            <div className="filter-group">
                                <label className="filter-label">Branch</label>
                                <select 
                                    className="filter-select"
                                    value={filters.branch}
                                    onChange={e => setFilters({...filters, branch: e.target.value})}
                                >
                                    <option value="">All Branches</option>
                                    {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Paygroup</label>
                                <select 
                                    className="filter-select"
                                    value={filters.paygroup}
                                    onChange={e => setFilters({...filters, paygroup: e.target.value})}
                                >
                                    <option value="">All Paygroups</option>
                                    {payGroups.map(p => <option key={p.payGroupId} value={p.payGroupId}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Request Type</label>
                                <select 
                                    className="filter-select"
                                    value={filters.type}
                                    onChange={e => setFilters({...filters, type: e.target.value})}
                                >
                                    <option value="">All Types</option>
                                    <option value="ADVANCE">Advance Requests</option>
                                    <option value="BRANCH_TRAVEL">Travel Requests</option>
                                </select>
                            </div>
                             <div className="filter-group">
                                <label className="filter-label">Search Employee</label>
                                <div className="search-row">
                                    <div className="search-input-wrapper">
                                        <FiSearch className="search-input-icon" />
                                        <input 
                                            type="text" 
                                            className="filter-input search-pl-10"
                                            placeholder="Name or ID..."
                                            value={filters.search}
                                            onChange={e => setFilters({...filters, search: e.target.value})}
                                        />
                                    </div>
                                    <button onClick={handleDownload} className="btn-download" title="Download CSV">
                                        <FiFileText /> <span>Download Report</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="summary-card-premium">
                            <div className="summary-content">
                                <div className="summary-info">
                                    <p className="summary-label">Total Outstanding Advance</p>
                                    <h2 className="summary-value">₹{totalAdvance.toLocaleString()}</h2>
                                </div>
                                <div className="summary-stats">
                                    <div className="stat-pill">
                                        <FiTrendingUp /> 
                                        <span>{reportData.length} Active Records</span>
                                    </div>
                                    <div className="stat-pill ml-10">
                                        <FiUser /> 
                                        <span>Recovery Tracked</span>
                                    </div>
                                </div>
                            </div>
                            <div className="summary-icon-container">
                                <FiPieChart size={40} />
                            </div>
                        </div>
                    </div>

                    <div className="analytics-grid-layout">
                        {/* Day-wise Report Panel */}
                        <div className="analytics-panel panel-small">
                             <h3 className="panel-title">
                                <FiCalendar /> Daily Disbursement Summary
                             </h3>
                            <div className="daily-cards-grid">
                                {sortedDates.length === 0 ? (
                                    <p className="empty-msg">No data for selected filters.</p>
                                ) : (
                                    sortedDates.map(date => (
                                        <div key={date} className="daily-touch-card" onClick={() => setFilters({...filters, search: new Date(date).toLocaleDateString()})}>
                                            <div className="card-date-strip">{new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                                            <div className="card-amount">₹{dayWiseData[date].toLocaleString()}</div>
                                            <div className="card-footer-info">View Records</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Individual Report Panel */}
                        <div className="analytics-panel panel-large overflow-hidden">
                             <h3 className="panel-title border-b p-4">
                                <FiUser /> Detailed Disbursement Log
                             </h3>
                            <div className="table-responsive">
                                <table className="analytics-table">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Branch</th>
                                            <th>Amount</th>
                                            <th>Date</th>
                                            <th>Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="empty-table-cell">No records match your filters.</td>
                                            </tr>
                                        ) : (
                                            reportData.map(adv => (
                                                <tr key={adv.requestId}>
                                                    <td>
                                                        <div className="emp-name">{formatName(adv.employeeName)}</div>
                                                        <div className="emp-id">{adv.employeeId}</div>
                                                    </td>
                                                    <td>
                                                        <div className="branch-val">{getBranchName(adv.branchId)}</div>
                                                    </td>
                                                    <td>
                                                        <div className="amt-val">₹{adv.data?.amount?.toLocaleString()}</div>
                                                    </td>
                                                    <td className="date-val">
                                                        {new Date(adv.updatedAt || adv.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="reason-val">
                                                        {adv.data?.reason}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: EMI TRACKING */}
            {activeTab === 'emi' && (
                <div className="tab-content">
                    <div className="emi-tracker-layout">
                        <div className="emi-list-panel">
                            <h3 className="panel-title mb-4">Select Employee Plan</h3>
                            {approvedAdvances.filter(adv => adv.type === 'ADVANCE').length === 0 ? (
                                <div className="empty-state">No approved advances found.</div>
                            ) : (
                                approvedAdvances.filter(adv => adv.type === 'ADVANCE').map(adv => (
                                    <div 
                                        key={adv.requestId} 
                                        className={`emi-nav-card ${selectedEmi?.requestId === adv.requestId ? 'active' : ''}`}
                                        onClick={() => setSelectedEmi(adv)}
                                    >
                                        <div className="emi-nav-top">
                                            <span className="emi-emp-name">{formatName(adv.employeeName)}</span>
                                            <span className="emi-emp-amt">₹{adv.data?.amount?.toLocaleString()}</span>
                                        </div>
                                        <div className="emi-nav-bottom">
                                            <div className="emi-nav-info">
                                                <span>{adv.data?.emiMonths} Months</span>
                                                <span className="dot-separator">•</span>
                                                <span>Approved: {new Date(adv.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="emi-details-panel">
                            {selectedEmi ? (
                                <div className="animate-fade-in">
                                    <div className="emi-detail-header">
                                        <div>
                                            <h2 className="title-lg">{formatName(selectedEmi.employeeName)}</h2>
                                            <p className="subtitle-sm">{selectedEmi.employeeId} • Recovery Schedule</p>
                                        </div>
                                        <div className="amount-summary">
                                            <div className="title-xl">₹{selectedEmi.data?.amount?.toLocaleString()}</div>
                                            <p className="label-xs-bold">Total Disbursed</p>
                                        </div>
                                    </div>

                                    <div className="emi-stats-row">
                                        <div className="emi-stat-card">
                                            <div className="stat-label">Monthly Recovery</div>
                                            <div className="stat-val">₹{Math.ceil(selectedEmi.data?.amount / selectedEmi.data?.emiMonths).toLocaleString()}</div>
                                        </div>
                                        <div className="emi-stat-card">
                                            <div className="stat-label">Plan Tenure</div>
                                            <div className="stat-val">{selectedEmi.data?.emiMonths} Months</div>
                                        </div>
                                        <div className="emi-stat-card highlight">
                                            <div className="stat-label">Current Status</div>
                                            <div className="stat-val">RECOVERING</div>
                                        </div>
                                    </div>

                                    <div className="schedule-container border">
                                        <table className="schedule-table">
                                            <thead>
                                                <tr>
                                                    <th>Installment</th>
                                                    <th>Scheduled Month</th>
                                                    <th>Amount</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {generateSchedule(
                                                    selectedEmi.data?.amount,
                                                    selectedEmi.data?.emiMonths,
                                                    selectedEmi.updatedAt
                                                ).map((item, i) => (
                                                    <tr key={i} className={item.isPast ? 'row-past' : ''}>
                                                        <td>EMI #{i + 1}</td>
                                                        <td>{item.month}</td>
                                                        <td className="font-bold text-center">₹{item.amount.toLocaleString()}</td>
                                                        <td className="text-center">
                                                            <span className={`status-pill ${item.isPast ? 'collected' : 'pending'}`}>
                                                                {item.isPast ? 'Collected' : 'Pending'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-detail-state">
                                    <FiClock size={64} className="mb-4 opacity-10" />
                                    <h3 className="title-md">EMI Schedule Details</h3>
                                    <p>Select an employee from the left panel to view their repayment timeline.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvanceTracking;
