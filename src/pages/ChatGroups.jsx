
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { FiPlus, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import { getEmployees, createGroup, deleteGroup, getUserGroups, markMessageAsRead, getBranches } from '../services/api';
import ChatWindow from '../components/ChatWindow';
import srmLogo from '../assets/srm-logo.png';
import './ChatGroups.css';

const ChatGroups = () => {
    const [groups, setGroups] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState(null);

    // Form state
    const [groupName, setGroupName] = useState('');
    const [task, setTask] = useState('');
    const [timeline, setTimeline] = useState('');
    const [groupType, setGroupType] = useState('standard'); // 'standard' or 'announcement'
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [branches, setBranches] = useState([]);

    // Hardcoded HR User for this portal view
    const currentUser = { id: 'hr-admin-1', name: 'HR Manager' };

    useEffect(() => {
        if (selectedGroupId) {
            sessionStorage.setItem('HR_ACTIVE_GROUP', selectedGroupId);
        } else {
            sessionStorage.removeItem('HR_ACTIVE_GROUP');
        }
    }, [selectedGroupId]);

    const fetchGroups = useCallback(async () => {
        try {
            const response = await getUserGroups(currentUser.id);
            if (response.success) {
                // If the currently selected group has unread messages, mark them as read immediately
                // and update the local state to 0 so the badge doesn't show
                const updatedGroups = response.data.map(g => {
                    // Safe string comparison for IDs
                    if (selectedGroupId && String(g.id) === String(selectedGroupId)) {
                        // If we are viewing this group, force unread count to 0 locally
                        // We also call markMessageAsRead as a backup, though ChatWindow handles it mostly
                        if (g.unreadCounts?.[currentUser.id] > 0) {
                            markMessageAsRead(g.id, currentUser.id).catch(console.error);
                        }
                        return { ...g, unreadCounts: { ...g.unreadCounts, [currentUser.id]: 0 } };
                    }
                    return g;
                });
                setGroups(updatedGroups);
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setLoading(false);
        }
    }, [currentUser.id, selectedGroupId]);

    // Clear on unmount
    useEffect(() => {
        return () => sessionStorage.removeItem('HR_ACTIVE_GROUP');
    }, []);

    useEffect(() => {
        // Fetch groups whenever the "logged in" user changes
        fetchGroups();
        const interval = setInterval(fetchGroups, 5000);
        return () => clearInterval(interval);
    }, [fetchGroups]);

    // Handle auto-selection from navigation state
    useEffect(() => {
        if (location.state?.groupId) {
            setSelectedGroupId(location.state.groupId);
        }
    }, [location.state]);

    useEffect(() => {
        fetchEmployees();
        fetchBranches();
    }, []);


    const fetchEmployees = async () => {
        try {
            const data = await getEmployees();
            if (data && data.employees) {
                setEmployees(data.employees);
            } else if (Array.isArray(data)) {
                setEmployees(data);
            } else {
                setEmployees([]);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            const data = await getBranches();
            setBranches(data.branches || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const handleGroupSelect = async (group) => {
        setSelectedGroupId(group.id);
        // Mark as read if there are unread messages
        if (group.unreadCounts?.[currentUser.id] > 0) {
            try {
                await markMessageAsRead(group.id, currentUser.id);
                // Update local state to reflect read status immediately
                setGroups(prev => prev.map(g =>
                    g.id === group.id
                        ? { ...g, unreadCounts: { ...g.unreadCounts, [currentUser.id]: 0 } }
                        : g
                ));
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            if (!groupName || selectedMembers.length === 0) {
                alert('Please enter a name and select members');
                return;
            }

            const payload = {
                name: groupName,
                task: task,
                timeline: timeline,
                groupType: groupType,
                members: [...selectedMembers, currentUser.id],
                createdBy: currentUser.id
            };

            const response = await createGroup(payload);
            setShowModal(false);
            setGroupName('');
            setTask('');
            setTimeline('');
            setSelectedMembers([]);
            fetchGroups(); // Refresh list

            // Auto-select new group if structure allows, or wait for fetch
            if (response?.data?.id) {
                // Ideally set selectedGroup here, but need full object. 
                // Next fetchGroups will get it.
            }
        } catch (error) {
            console.error('Error creating group:', error);
            const errMsg = error.response?.data?.message || error.message || 'Failed to create group';
            alert(`Error: ${errMsg}`);
        }
    };

    const handleDeleteGroup = async (e, groupId) => {
        e.stopPropagation(); // Prevent selecting the group when clicking delete
        if (window.confirm('Are you sure you want to delete this group? This cannot be undone.')) {
            try {
                await deleteGroup(groupId);
                if (String(selectedGroupId) === String(groupId)) {
                    setSelectedGroupId(null);
                }
                fetchGroups();
            } catch (error) {
                console.error('Error deleting group:', error);
                alert('Failed to delete group');
            }
        }
    };

    const toggleMember = (employeeId) => {
        if (selectedMembers.includes(employeeId)) {
            setSelectedMembers(selectedMembers.filter(id => id !== employeeId));
        } else {
            setSelectedMembers([...selectedMembers, employeeId]);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Derive selected group object from groups list
    const selectedGroup = groups.find(g => String(g.id) === String(selectedGroupId));

    // Group employees by branch
    const employeesByBranch = filteredEmployees.reduce((acc, emp) => {
        const branchId = emp.branchId || 'Unassigned';
        const branchName = branches.find(b => b.branchId === branchId)?.name || 'Unassigned';
        if (!acc[branchId]) {
            acc[branchId] = { name: branchName, employees: [] };
        }
        acc[branchId].employees.push(emp);
        return acc;
    }, {});

    return (
        <div className="chat-page-container">
            <div className="groups-sidebar">
                <div className="sidebar-header">
                    <div className="header-left">
                        <h1>Chat Groups</h1>
                    </div>
                    <button className="btn-icon" onClick={() => setShowModal(true)} title="New Group">
                        <FiPlus />
                    </button>
                </div>

                <div className="groups-list">
                    {loading ? (
                        <div className="loading-text">Loading...</div>
                    ) : groups.length === 0 ? (
                        <div className="no-groups">
                            <p>No conversations yet</p>
                            <button className="btn-text" onClick={() => setShowModal(true)}>Start one</button>
                        </div>
                    ) : (
                        groups.map(group => {
                            const isSelected = String(group.id) === String(selectedGroupId);
                            return (
                                <div
                                    key={group.id}
                                    className={`group-item ${isSelected ? 'active' : ''}`}
                                    onClick={() => handleGroupSelect(group)}
                                >
                                    <div className="group-avatar">
                                        <img src={srmLogo} alt="Grp" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    </div>
                                    <div className="group-content">
                                        <div className="group-name-row">
                                            <h3>{group.name}</h3>
                                            <span className="group-time">
                                                {/* Could format lastMessageTime here */}
                                            </span>
                                        </div>
                                        <div className="group-preview">
                                            <p>{group.lastMessage || 'No messages yet'}</p>
                                        </div>
                                    </div>
                                    {String(group.id) !== String(selectedGroupId) && group.unreadCounts?.[currentUser.id] > 0 && (
                                        <div className="unread-badge">
                                            {group.unreadCounts[currentUser.id]}
                                        </div>
                                    )}
                                    {group.createdBy === currentUser.id && (
                                        <button
                                            className="btn-delete-mini"
                                            onClick={(e) => handleDeleteGroup(e, group.id)}
                                            title="Delete Group"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="chat-main-area">
                <ChatWindow group={selectedGroup} currentUser={currentUser} />
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>New Group</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}><FiX /></button>
                        </div>
                        <form onSubmit={handleCreateGroup}>
                            <div className="form-group">
                                <label>Group Name</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="e.g. Sales Team"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Timeline / Deadline</label>
                                <input
                                    type="text"
                                    value={timeline}
                                    onChange={(e) => setTimeline(e.target.value)}
                                    placeholder="e.g. 2 Days, or Dec 31st"
                                />
                            </div>

                            <div className="form-group">
                                <label>Group Type</label>
                                <select
                                    value={groupType}
                                    onChange={(e) => setGroupType(e.target.value)}
                                    className="simple-select"
                                >
                                    <option value="standard">Standard (Everyone chats)</option>
                                    <option value="announcement">Announcement (Admins only, Employees vote)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Task / Objective</label>
                                <textarea
                                    className="task-input"
                                    value={task}
                                    onChange={(e) => setTask(e.target.value)}
                                    placeholder="What is this group for?"
                                    rows={2}
                                />
                            </div>

                            <div className="form-group">
                                <label>Timeline</label>
                                <div className="timeline-inputs">
                                    <input
                                        type="date"
                                        title="Start Date"
                                        value={timeline.split(' - ')[0] || ''}
                                        onChange={(e) => {
                                            const start = e.target.value;
                                            const end = timeline.split(' - ')[1] || '';
                                            setTimeline(`${start}${end ? ' - ' + end : ''}`);
                                        }}
                                    />
                                    <span className="separator">to</span>
                                    <input
                                        type="date"
                                        title="End Date"
                                        value={timeline.split(' - ')[1] || ''}
                                        onChange={(e) => {
                                            const start = timeline.split(' - ')[0] || '';
                                            const end = e.target.value;
                                            setTimeline(`${start ? start + ' - ' : ''}${end}`);
                                        }}
                                    />
                                </div>
                            </div>



                            <div className="form-group">
                                <label>Select Members</label>
                                <div className="search-box">
                                    <FiSearch />
                                    <input
                                        type="text"
                                        placeholder="Search employees..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="members-list">
                                    {Object.entries(employeesByBranch).map(([branchId, { name, employees }]) => (
                                        <div key={branchId} className="branch-section">
                                            <div className="branch-header">{name}</div>
                                            {employees.map(emp => (
                                                <div
                                                    key={emp.employeeId}
                                                    className={`member-item ${selectedMembers.includes(emp.employeeId) ? 'selected' : ''}`}
                                                    onClick={() => toggleMember(emp.employeeId)}
                                                >
                                                    <div className="checkbox">
                                                        {selectedMembers.includes(emp.employeeId) && <span>✓</span>}
                                                    </div>
                                                    <div className="member-details">
                                                        <span className="name">{emp.name}</span>
                                                        <span className="id">{emp.employeeId}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                <div className="selected-count">
                                    {selectedMembers.length} selected
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create Group</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatGroups;
