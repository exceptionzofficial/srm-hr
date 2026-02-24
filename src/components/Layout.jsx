import React, { useState, useEffect, useRef } from 'react';
import {
    FiUsers,
    FiDollarSign,
    FiLogOut,
    FiMenu,
    FiFileText,
    FiClipboard,
    FiMapPin,
    FiBarChart2,
    FiSmartphone,
    FiMonitor,
    FiMessageSquare,
    FiBookOpen
} from 'react-icons/fi';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import './Layout.css';
import { getUserGroups } from '../services/api';
import srmLogo from '../assets/srm-logo.png';


const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [notification, setNotification] = useState(null); // { message, type, groupId }
    const lastCheckedTimeRef = useRef(Date.now());
    const navigate = useNavigate();

    // Get Current User ID from LocalStorage (set during Login)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const CURRENT_USER_ID = user.employeeId || 'HR-ADMIN-DEFAULT'; // Fallback to avoid 404s

    useEffect(() => {
        fetchPendingRequests();
        checkNewMessages();

        // Poll every 30 seconds for requests
        const requestInterval = setInterval(fetchPendingRequests, 30000);

        // Poll every 10 seconds for chat messages
        const chatInterval = setInterval(checkNewMessages, 10000);

        return () => {
            clearInterval(requestInterval);
            clearInterval(chatInterval);
        };
    }, []);

    // Clear notification after 4 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const checkNewMessages = async () => {
        try {
            const response = await getUserGroups(CURRENT_USER_ID);
            if (response.success && response.data) {
                // Find groups updated since last check
                const newMessages = response.data.filter(g => {
                    // Check if updated recently (after lastCheckedTime)
                    // Firestore timestamp conversion might be needed if not auto-converted by api.js
                    // Use fallback to Date.parse if it's a string, or .seconds if timestamp object
                    let updatedTime = g.updatedAt;
                    if (updatedTime && typeof updatedTime === 'object' && updatedTime._seconds) {
                        updatedTime = updatedTime._seconds * 1000;
                    } else if (typeof updatedTime === 'string') {
                        updatedTime = new Date(updatedTime).getTime();
                    }

                    const activeGroupId = sessionStorage.getItem('HR_ACTIVE_GROUP');
                    const isNew = updatedTime > lastCheckedTimeRef.current;
                    const notMe = g.lastMessageSender !== 'HR Manager';
                    const notActive = String(g.id) !== String(activeGroupId);

                    return isNew && notMe && notActive;
                });

                if (newMessages.length > 0) {
                    const lastGroup = newMessages[0];
                    showNotification(
                        `New message in ${lastGroup.name}: ${lastGroup.lastMessage}`,
                        lastGroup.id
                    );
                    lastCheckedTimeRef.current = Date.now();
                } else {
                    // Update check time to avoid notifying old messages on reload if logic changes
                    lastCheckedTimeRef.current = Date.now();
                }
            }
        } catch (error) {
            console.error('Error checking messages:', error);
        }
    };

    const showNotification = (msg, groupId = null) => {
        setNotification({ message: msg, type: 'info', groupId });
    };

    const handleNotificationClick = () => {
        if (notification?.groupId) {
            navigate('/chat', { state: { groupId: notification.groupId } });
            setNotification(null);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            // Since this component is inside 'components', and api is in '../services/api'
            const { getAllRequests } = await import('../services/api');
            const branchId = user.role !== 'HR_ADMIN' && user.role !== 'SUPER_ADMIN' ? user.branchId : null;
            const data = await getAllRequests('PENDING', branchId);
            if (data && data.requests) {
                setPendingCount(data.requests.length);
            }
        } catch (error) {
            console.error('Error fetching pending requests:', error);
        }
    };

    return (
        <div className="layout">
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="logo-area">
                    <img src={srmLogo} alt="SRM Sweets" />
                    <h2>HR Portal</h2>
                </div>
                <nav>
                    <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiUsers /> Employees
                    </NavLink>
                    {['HR_ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'].includes(user.role) && (
                        <NavLink to="/salary" className={({ isActive }) => isActive ? 'active' : ''}>
                            <FiDollarSign /> Salary Management
                        </NavLink>
                    )}
                    <NavLink to="/requests" className={({ isActive }) => isActive ? 'active' : ''}>
                        <div className="nav-item-content">
                            <span><FiFileText /> Requests</span>
                            {pendingCount > 0 && (
                                <span className="notification-badge">{pendingCount}</span>
                            )}
                        </div>
                    </NavLink>
                    <NavLink to="/tracking" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiMapPin /> Live Tracking
                    </NavLink>
                    <NavLink to="/attendance-report" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiBarChart2 /> Attendance Report
                    </NavLink>
                    <NavLink to="/attendance/mobile" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiSmartphone /> Mobile Attendance
                    </NavLink>
                    <NavLink to="/attendance/kiosk" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiMonitor /> Kiosk Attendance
                    </NavLink>
                    <NavLink to="/chat" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiMessageSquare /> Chat Groups
                    </NavLink>
                    {['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role) && (
                        <NavLink to="/rules" className={({ isActive }) => isActive ? 'active' : ''}>
                            <FiBookOpen /> Rules
                        </NavLink>
                    )}
                </nav>
                <div className="logout">
                    <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }}><FiLogOut /> Logout</button>
                </div>
            </aside>
            <main className="content">
                {notification && (
                    <div
                        className="notification-toast"
                        onClick={handleNotificationClick}
                        style={{ cursor: notification.groupId ? 'pointer' : 'default' }}
                    >
                        <FiUsers className="toast-icon" />
                        <div className="toast-body">
                            <span className="toast-message">{notification.message}</span>
                        </div>
                        <button className="toast-close" onClick={(e) => { e.stopPropagation(); setNotification(null); }}>×</button>
                    </div>
                )}
                <header className="top-bar">
                    <div className="top-bar-left">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="toggle-btn">
                            <FiMenu />
                        </button>
                    </div>
                    <div className="top-bar-right">
                        <div className="user-profile-summary">
                            <div className="user-info-text">
                                <span className="user-role-badge">{user.role === 'HR_ADMIN' ? 'HR Manager' : (user.role?.replace('_', ' ') || 'HR Manager')}</span>
                                <span className="user-name-display">{user.name || 'Manager'}</span>
                            </div>
                            <div className="user-profile-avatar">
                                <FiUsers />
                            </div>
                        </div>
                    </div>
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
