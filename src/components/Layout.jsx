
import { useState, useEffect, useRef } from 'react';
import { FiUsers, FiDollarSign, FiLogOut, FiMenu, FiFileText, FiClipboard } from 'react-icons/fi';
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
            // We need to import getAllRequests properly. 
            // Since this component is inside 'components', and api is in '../services/api'
            const { getAllRequests } = await import('../services/api');
            const data = await getAllRequests('PENDING');
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
                    <NavLink to="/salary" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiDollarSign /> Salary Management
                    </NavLink>
                    <NavLink to="/requests" className={({ isActive }) => isActive ? 'active' : ''}>
                        <div className="nav-item-content">
                            <span><FiFileText /> Requests</span>
                            {pendingCount > 0 && (
                                <span className="notification-badge">{pendingCount}</span>
                            )}
                        </div>
                    </NavLink>
                    <NavLink to="/attendance-report" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiClipboard /> Attendance Report
                    </NavLink>
                    <NavLink to="/attendance/mobile" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiClipboard /> Mobile Attendance
                    </NavLink>
                    <NavLink to="/attendance/kiosk" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiClipboard /> Kiosk Attendance
                    </NavLink>
                    <NavLink to="/chat" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiUsers /> Chat Groups
                    </NavLink>
                    <NavLink to="/rules" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FiFileText /> Rules
                    </NavLink>
                </nav>
                <div className="logout">
                    <button><FiLogOut /> Logout</button>
                </div>
            </aside>
            <main className="content">
                {notification && (
                    <div
                        className="notification-toast"
                        onClick={handleNotificationClick}
                        style={{ cursor: notification.groupId ? 'pointer' : 'default' }}
                    >
                        <div className="toast-content">
                            <FiUsers className="toast-icon" />
                            <span>{notification.message}</span>
                        </div>
                        <button className="toast-close" onClick={(e) => { e.stopPropagation(); setNotification(null); }}>×</button>
                    </div>
                )}
                <header className="top-bar">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="toggle-btn">
                        <FiMenu />
                    </button>
                    <span style={{ fontWeight: 500 }}>Welcome, HR Manager</span>
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div >
    );
};

export default Layout;
