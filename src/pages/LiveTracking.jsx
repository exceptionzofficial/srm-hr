import React, { useState, useEffect } from 'react';
import { getAllEmployeeLocations } from '../services/api';
import './LiveTracking.css';
import { FiMapPin, FiRefreshCw, FiNavigation, FiClock } from 'react-icons/fi';

const LiveTracking = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const loadData = async () => {
        setLoading(true);
        try {
            // Determine Branch Context based on Role
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = user.role || '';
            const userBranchId = user.branchId;
            const allowedAdminRoles = ['HR', 'SUPER_ADMIN', 'ADMIN'];

            let queryBranchId = null;
            if (!allowedAdminRoles.includes(userRole)) {
                if (userBranchId) {
                    queryBranchId = userBranchId;
                }
            }

            const data = await getAllEmployeeLocations(queryBranchId);
            if (data.success) {
                // Sort: Tracking first, then Online, then Offline
                const sorted = data.employees.sort((a, b) => {
                    if (a.isTracking === b.isTracking) {
                        return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
                    }
                    return (b.isTracking ? 1 : 0) - (a.isTracking ? 1 : 0);
                });
                setEmployees(sorted);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Failed to load locations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const getStatusClass = (emp) => {
        if (emp.isTracking) return 'tracking';
        if (emp.isOnline) return 'online';
        return 'offline';
    };

    const getStatusLabel = (emp) => {
        if (emp.isTracking) return 'Tracking Live';
        if (emp.isOnline) return 'Online';
        return 'Offline';
    };

    const formatTime = (isoString) => {
        if (!isoString) return 'Unknown';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDistance = (meters) => {
        if (!meters && meters !== 0) return '-';
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1000).toFixed(2)}km`;
    };

    // Calculate stats
    const activeCount = employees.filter(e => e.isTracking).length;
    const onlineCount = employees.filter(e => e.isOnline).length;

    return (
        <div className="live-tracking-page">
            <div className="page-header tracking-header">
                <div>
                    <h2 className="page-title">Live Field Tracking</h2>
                    <p className="text-muted">Real-time location updates for field staff</p>
                </div>
                <button className="refresh-btn" onClick={loadData} disabled={loading}>
                    <FiRefreshCw className={loading ? 'spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="stats-bar">
                <div className="stat-card">
                    <span className="stat-val" style={{ color: '#3498db' }}>{activeCount}</span>
                    <span className="stat-label">Actively Tracking</span>
                </div>
                <div className="stat-card">
                    <span className="stat-val" style={{ color: '#2ecc71' }}>{onlineCount}</span>
                    <span className="stat-label">Online Today</span>
                </div>
                <div className="stat-card">
                    <span className="stat-val">{employees.length}</span>
                    <span className="stat-label">Total Employees</span>
                </div>
            </div>

            {loading && employees.length === 0 ? (
                <div className="loading-state">Loading location data...</div>
            ) : (
                <div className="tracking-grid">
                    {employees.map(emp => (
                        <div key={emp.employeeId} className={`employee-track-card ${getStatusClass(emp)}`}>
                            <div className="card-header">
                                <div>
                                    <h3 className="emp-name">{emp.name}</h3>
                                    <p className="emp-dept">{emp.department} • {emp.branchName}</p>
                                </div>
                                <span className={`status-indicator ${getStatusClass(emp)}`}>
                                    {getStatusLabel(emp)}
                                </span>
                            </div>

                            <div className="card-body">
                                <div className="info-row">
                                    <span className="info-label">Last Update</span>
                                    <span className="info-val">
                                        <FiClock style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                        {emp.lastLocation ? formatTime(emp.lastLocation.timestamp) : '-'}
                                    </span>
                                </div>

                                {emp.isTracking && (
                                    <>
                                        <div className="info-row">
                                            <span className="info-label">Current Task</span>
                                            <span className="info-val">Field Visit</span>
                                        </div>
                                    </>
                                )}

                                {emp.lastLocation && (
                                    <a
                                        href={`https://www.google.com/maps?q=${emp.lastLocation.latitude},${emp.lastLocation.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="map-link-btn"
                                    >
                                        <FiMapPin style={{ marginRight: 6 }} />
                                        View On Map
                                    </a>
                                )}

                                {!emp.lastLocation && (
                                    <div className="no-location-msg" style={{ padding: 10, textAlign: 'center', color: '#999', fontSize: 13 }}>
                                        No location data available today
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LiveTracking;
