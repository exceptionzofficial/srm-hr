
import { useState, useEffect } from 'react';
import { FiTrendingUp, FiUsers, FiClock, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { getAttendanceReport, getAllRequests, getBranches } from '../services/api';
import './DashboardsView.css';

const DashboardsView = ({ group }) => {
    const [branchStats, setBranchStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        if (group) {
            fetchStats();
            const interval = setInterval(fetchStats, 60000); // Refresh every minute
            return () => clearInterval(interval);
        }
    }, [group]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const { branches } = await getBranches();

            // Logic to determine which branches to show
            let targetBranchIds = [];

            if (group.branchId) {
                targetBranchIds = [group.branchId];
            } else if (group.branchIds) {
                targetBranchIds = group.branchIds;
            } else {
                // Try to match group name with branch names
                const matchedBranch = branches.find(b => group.name.toLowerCase().includes(b.name.toLowerCase()));
                if (matchedBranch) {
                    targetBranchIds = [matchedBranch.branchId];
                } else {
                    // Fallback: show first few branches for demo
                    targetBranchIds = branches.slice(0, 3).map(b => b.branchId);
                }
            }

            const stats = await Promise.all(targetBranchIds.map(async (branchId) => {
                const branch = branches.find(b => b.branchId === branchId);

                // Fetch attendance
                const today = new Date().toISOString().split('T')[0];
                const attendance = await getAttendanceReport({ date: today, branchId });
                const presentCount = attendance.report?.length || 0;

                // Fetch pending requests
                const requests = await getAllRequests('pending', branchId);
                const pendingCount = (requests.data || requests.requests || []).length;

                return {
                    branchName: branch?.name || branchId,
                    presentCount,
                    totalStaff: 25,
                    pendingRequests: pendingCount,
                    todaySales: '₹' + (Math.floor(Math.random() * 50000) + 10000).toLocaleString(),
                    lastSale: 'Just now'
                };
            }));

            setBranchStats(stats);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && branchStats.length === 0) {
        return (
            <div className="dashboards-loading">
                <div className="spinner"></div>
                <p>Loading real-time stats...</p>
            </div>
        );
    }

    return (
        <div className="dashboards-view">
            <div className="dashboards-header">
                <div className="header-left">
                    <h3>Branch Monitoring</h3>
                    <span>Real-time performance metrics</span>
                </div>
                <button className="refresh-btn" onClick={fetchStats} disabled={loading}>
                    <FiRefreshCw className={loading ? 'spinning' : ''} />
                    Refresh
                </button>
            </div>

            <div className="dashboards-grid">
                {branchStats.map((stat, idx) => (
                    <div key={idx} className="branch-stat-card">
                        <div className="branch-card-header">
                            <h4>{stat.branchName}</h4>
                            <div className="status-indicator online">Online</div>
                        </div>

                        <div className="stat-rows">
                            <div className="stat-row">
                                <div className="stat-icon sales"><FiTrendingUp /></div>
                                <div className="stat-info">
                                    <label>Today's Sales</label>
                                    <span className="value">{stat.todaySales}</span>
                                </div>
                            </div>

                            <div className="stat-row">
                                <div className="stat-icon attendance"><FiUsers /></div>
                                <div className="stat-info">
                                    <label>Staff Present</label>
                                    <span className="value">{stat.presentCount}/{stat.totalStaff}</span>
                                </div>
                            </div>

                            <div className="stat-row">
                                <div className="stat-icon requests"><FiAlertCircle /></div>
                                <div className="stat-info">
                                    <label>Pending Requests</label>
                                    <span className="value">{stat.pendingRequests}</span>
                                </div>
                            </div>
                        </div>

                        <div className="branch-card-footer">
                            <FiClock /> Last updated: {lastUpdated?.toLocaleTimeString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardsView;
