
import { useState, useEffect, useRef } from 'react';
import { FiSend, FiMessageSquare, FiBarChart2, FiX, FiPlus, FiImage, FiPaperclip, FiCheckCircle, FiClock, FiUser, FiUsers, FiUserPlus, FiArrowDown, FiSearch } from 'react-icons/fi';
import { getMessages, sendMessage, markMessageAsRead, votePoll, updateGroup, getEmployees } from '../services/api';
import './ChatWindow.css';

const ChatWindow = ({ group, currentUser }) => {
    const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'tasks', or 'members'
    const [messages, setMessages] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);

    // File Upload State
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Poll State
    const [showPollModal, setShowPollModal] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);

    // Task State
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDeadline, setTaskDeadline] = useState('');

    // Add Member State
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [addMemberSearch, setAddMemberSearch] = useState('');
    const [selectedNewMembers, setSelectedNewMembers] = useState([]);

    const messagesEndRef = useRef(null);
    const messagesAreaRef = useRef(null);
    const intervalRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [unreadCountScroll, setUnreadCountScroll] = useState(0);
    const prevMessagesLength = useRef(0);

    // Initial fetch and polling setup
    useEffect(() => {
        if (group?.id) {
            setMessages([]); // Clear previous messages
            setTasks([]);
            fetchMessages();

            // Poll for new messages every 3 seconds (simple real-time)
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                fetchMessages();
            }, 3000);

            fetchEmployeesList();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [group?.id]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (activeTab === 'chat') {
            if (isAtBottom) {
                scrollToBottom('auto');
            } else if (messages.length > prevMessagesLength.current) {
                // New message arrived while user is scrolled up
                const newCount = messages.length - prevMessagesLength.current;
                setUnreadCountScroll(prev => prev + newCount);
            }
        }
        prevMessagesLength.current = messages.length;
    }, [messages, activeTab, isAtBottom]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const atBottom = scrollHeight - scrollTop <= clientHeight + 100; // 100px threshold
        setIsAtBottom(atBottom);
        if (atBottom) {
            setUnreadCountScroll(0);
        }
    };

    useEffect(() => {
        // Update tasks when group prop updates
        if (group?.tasks && Array.isArray(group.tasks)) {
            setTasks(group.tasks);
        }
    }, [group]);


    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
        setUnreadCountScroll(0);
        setIsAtBottom(true);
    };

    const fetchEmployeesList = async () => {
        try {
            const data = await getEmployees();
            setEmployees(data.employees || []);
        } catch (error) {
            console.error("Error fetching employees", error);
        }
    }

    const fetchMessages = async () => {
        try {
            const response = await getMessages(group.id);
            if (response.success) {
                setMessages(response.data);
                // Mark as read immediately when messages are fetched/viewed
                markMessageAsRead(group.id, currentUser.id).catch(console.error);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || !group?.id) return;

        try {
            let payload = {
                content: newMessage,
                senderName: currentUser.name || "User",
                senderId: currentUser.id,
                type: 'text'
            };

            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('senderName', currentUser.name || "User");
                formData.append('senderId', currentUser.id);
                // Type is handled by backend or derived from file
                payload = formData;
            }

            await sendMessage(group.id, payload);
            setNewMessage('');
            setSelectedFile(null);
            setPreviewUrl(null);
            fetchMessages();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!taskTitle || !group?.id) return;

        try {
            const taskData = {
                title: taskTitle,
                deadline: taskDeadline,
                status: 'pending',
                createdBy: currentUser.id,
                createdByName: currentUser.name,
                createdAt: new Date().toISOString(),
                id: Date.now().toString()
            };

            // Append new task to existing tasks
            const updatedTasks = [...(tasks || []), taskData];

            // Update group with new tasks array AND pinned task
            await updateGroup(group.id, {
                tasks: updatedTasks,
                task: taskTitle, // Pin the latest task automatically
                timeline: taskDeadline || ''
            });

            setTasks(updatedTasks);
            setTaskTitle('');
            setTaskDeadline('');
            setShowTaskModal(false);
        } catch (error) {
            console.error('Error creating task:', error);
            alert('Failed to create task');
        }
    };

    const handleCreatePoll = async (e) => {
        e.preventDefault();
        if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) {
            alert('Please fill out the question and all options');
            return;
        }

        try {
            await sendMessage(group.id, {
                senderId: currentUser.id,
                senderName: currentUser.name,
                content: pollQuestion,
                type: 'poll',
                pollData: {
                    options: pollOptions,
                    votes: {}
                }
            });
            setShowPollModal(false);
            setPollQuestion('');
            setPollOptions(['', '']);
            fetchMessages();
        } catch (error) {
            console.error('Error creating poll:', error);
            alert('Failed to create poll');
        }
    };

    const handleVote = async (messageId, optionIndex) => {
        try {
            await votePoll(group.id, messageId, currentUser.id, optionIndex);
            fetchMessages();
        } catch (error) {
            console.error('Error voting:', error);
        }
    };

    const handleToggleTask = async (taskId) => {
        try {
            const updatedTasks = tasks.map(t => {
                if (t.id === taskId) {
                    return { ...t, status: t.status === 'completed' ? 'pending' : 'completed' };
                }
                return t;
            });
            await updateGroup(group.id, { tasks: updatedTasks });
            setTasks(updatedTasks);
        } catch (error) {
            console.error('Error toggling task:', error);
        }
    };

    const getResolvedMembers = () => {
        if (!group?.members) return [];
        return group.members.map(memberId => {
            const emp = employees.find(e => e.employeeId === memberId);
            return {
                id: memberId,
                name: emp?.name || memberId,
                designation: emp?.designation || '',
            };
        });
    };

    const getNonMembers = () => {
        if (!group?.members) return employees;
        return employees.filter(emp => !group.members.includes(emp.employeeId));
    };

    const toggleNewMember = (employeeId) => {
        setSelectedNewMembers(prev =>
            prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]
        );
    };

    const handleAddMembers = async () => {
        if (selectedNewMembers.length === 0) return;
        try {
            const updatedMembers = [...(group.members || []), ...selectedNewMembers];
            await updateGroup(group.id, { members: updatedMembers });
            // Update local group object
            group.members = updatedMembers;
            setSelectedNewMembers([]);
            setAddMemberSearch('');
            setShowAddMemberModal(false);
        } catch (error) {
            console.error('Error adding members:', error);
            alert('Failed to add members');
        }
    };

    const handleAddOption = () => {
        if (pollOptions.length < 5) {
            setPollOptions([...pollOptions, '']);
        }
    };

    const updateOption = (index, value) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderPoll = (msg) => {
        const totalVotes = Object.values(msg.pollData?.votes || {}).length;
        const myVote = msg.pollData?.votes?.[currentUser.id];

        return (
            <>
                <div className="poll-container">
                    <div className="poll-question">{msg.content}</div>
                    <div className="poll-options">
                        {msg.pollData?.options?.map((option, idx) => {
                            const votesForOption = Object.values(msg.pollData?.votes || {}).filter(v => v === idx).length;
                            const percentage = totalVotes === 0 ? 0 : Math.round((votesForOption / totalVotes) * 100);
                            const isSelected = myVote === idx;

                            return (
                                <div
                                    key={idx}
                                    className={`poll-option ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleVote(msg.id, idx)}
                                >
                                    <div className="poll-bar" style={{ width: `${percentage}%` }}></div>
                                    <div className="poll-text">
                                        <span>{option}</span>
                                        <span className="poll-count">{percentage}% ({votesForOption})</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Votes inside card or outside? Screenshot shows votes outside on the right, but let's keep it simple first */}
                </div>
                <div className="poll-footer">
                    <span>{totalVotes} votes</span>
                    <span>{formatTime(msg.timestamp)}</span>
                </div>
            </>
        );
    };

    const renderMedia = (msg) => {
        if (msg.type === 'image') {
            return (
                <div className="message-media">
                    <img src={msg.fileUrl} alt="Shared Image" onClick={() => window.open(msg.fileUrl, '_blank')} />
                    {msg.content && <div className="media-caption">{msg.content}</div>}
                </div>
            );
        } else if (msg.type === 'video') {
            return (
                <div className="message-media">
                    <video controls>
                        <source src={msg.fileUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    {msg.content && <div className="media-caption">{msg.content}</div>}
                </div>
            );
        }
        return <div className="message-content">{msg.content}</div>;
    };

    if (!group) {
        return (
            <div className="chat-window empty">
                <div className="empty-chat">
                    <FiMessageSquare />
                    <h3>Select a group to start chatting</h3>
                    <p>Choose a group from the list on the left</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-window">
            <div className="chat-header">
                <div className="header-top">
                    <div className="header-info">
                        <h3>{group.name}</h3>
                        <span>{group.members?.length} members</span>
                    </div>
                    {group.task && (
                        <div className="pinned-task">
                            <strong>📌 Task:</strong> {group.task}
                            {group.timeline && <span className="pinned-time"> ({group.timeline})</span>}
                        </div>
                    )}
                </div>
            </div>

            <div className="chat-body">
                <div className="vertical-tabs">
                    <button
                        className={`vertical-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                        title="Chat"
                    >
                        <FiMessageSquare className="tab-icon" />
                        <span>Chat</span>
                    </button>
                    <button
                        className={`vertical-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tasks')}
                        title="Tasks"
                    >
                        <FiCheckCircle className="tab-icon" />
                        <span>Tasks</span>
                    </button>
                    <button
                        className={`vertical-tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                        onClick={() => setActiveTab('members')}
                        title="Members"
                    >
                        <FiUsers className="tab-icon" />
                        <span>Members</span>
                    </button>
                </div>

                <div className="chat-content-area">

                    {activeTab === 'chat' ? (
                        <>
                            <div className="messages-area" ref={messagesAreaRef} onScroll={handleScroll}>
                                {messages.length === 0 ? (
                                    <div className="empty-chat">
                                        <p>No messages yet. Say hello!</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isOwn = msg.senderId === currentUser.id;
                                        return (
                                            <div key={msg.id} className={`message ${isOwn ? 'sent' : 'received'} ${msg.type === 'poll' ? 'poll-message' : ''}`}>
                                                {!isOwn && <span className="message-sender">{msg.senderName}</span>}
                                                {msg.type === 'poll' ? renderPoll(msg) :
                                                    (msg.type === 'image' || msg.type === 'video') ? renderMedia(msg) :
                                                        <div className="message-content">{msg.content}</div>
                                                }
                                                {msg.type !== 'poll' && <span className="message-time">{formatTime(msg.timestamp)}</span>}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />

                                {!isAtBottom && (
                                    <button
                                        type="button"
                                        className="scroll-bottom-btn"
                                        onClick={() => scrollToBottom()}
                                        title="Scroll to bottom"
                                    >
                                        <FiArrowDown />
                                        {unreadCountScroll > 0 && <span className="unread-scroll-dot">{unreadCountScroll}</span>}
                                    </button>
                                )}
                            </div>

                            <div className="input-container">
                                {previewUrl && (
                                    <div className="file-preview">
                                        {selectedFile?.type.startsWith('image') ? (
                                            <img src={previewUrl} alt="Preview" />
                                        ) : (
                                            <div className="file-icon"><FiPaperclip /> {selectedFile?.name}</div>
                                        )}
                                        <button className="remove-file" onClick={clearFile}><FiX /></button>
                                    </div>
                                )}
                                <form className="input-area" onSubmit={handleSend}>
                                    <button type="button" className="btn-icon-secondary" onClick={() => setShowPollModal(true)} title="Create Poll">
                                        <FiBarChart2 />
                                    </button>
                                    <button type="button" className="btn-icon-secondary" onClick={() => fileInputRef.current.click()} title="Attach File">
                                        <FiImage />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleFileSelect}
                                        accept="image/*,video/*"
                                    />
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                    />
                                    <button type="submit" className="btn-send" disabled={!newMessage.trim() && !selectedFile}>
                                        <FiSend />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : activeTab === 'tasks' ? (
                        <div className="tasks-area">
                            <div className="tasks-header">
                                <h3>Team Tasks</h3>
                                <button className="btn-primary-sm" onClick={() => setShowTaskModal(true)}>
                                    <FiPlus /> New Task
                                </button>
                            </div>
                            <div className="tasks-list">
                                {tasks.length === 0 ? (
                                    <div className="no-tasks">
                                        <p>No tasks assigned yet.</p>
                                    </div>
                                ) : (
                                    tasks.map(task => (
                                        <div key={task.id} className={`task-card ${task.status === 'completed' ? 'task-completed' : ''}`}>
                                            <div className="task-status task-toggle" onClick={() => handleToggleTask(task.id)} title={task.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}>
                                                {task.status === 'completed' ? <FiCheckCircle color="#27ae60" size={22} /> : <div className="status-circle"></div>}
                                            </div>
                                            <div className="task-details">
                                                <h4>{task.title}</h4>
                                                <div className="task-meta">
                                                    <span><FiUser /> {employees.find(e => e.employeeId === task.assigneeId)?.name || task.assigneeId || 'Unassigned'}</span>
                                                    <span><FiClock /> {task.deadline}</span>
                                                </div>
                                                {task.status === 'completed' && <span className="completed-label">✓ Completed</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'members' ? (
                        <div className="members-area">
                            <div className="members-header">
                                <h3>Group Members ({group?.members?.length || 0})</h3>
                                <button className="btn-primary-sm" onClick={() => { setShowAddMemberModal(true); setSelectedNewMembers([]); setAddMemberSearch(''); }}>
                                    <FiUserPlus /> Add Member
                                </button>
                            </div>
                            <div className="members-list-view">
                                {getResolvedMembers().map(member => (
                                    <div key={member.id} className="member-card">
                                        <div className="member-avatar">
                                            {member.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="member-info">
                                            <span className="member-name">{member.name}</span>
                                            <span className="member-id">{member.id}</span>
                                            {member.designation && <span className="member-designation">{member.designation}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div> {/* End of chat-content-area */}
            </div> {/* End of chat-body */}

            {showAddMemberModal && (
                <div className="modal-overlay">
                    <div className="modal-content add-member-modal">
                        <div className="modal-header">
                            <h2>Add Members</h2>
                            <button className="close-btn" onClick={() => setShowAddMemberModal(false)}><FiX /></button>
                        </div>
                        <div className="add-member-search">
                            <FiSearch />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={addMemberSearch}
                                onChange={(e) => setAddMemberSearch(e.target.value)}
                            />
                        </div>
                        <div className="add-member-list">
                            {getNonMembers()
                                .filter(emp => emp.name?.toLowerCase().includes(addMemberSearch.toLowerCase()) || emp.employeeId?.toLowerCase().includes(addMemberSearch.toLowerCase()))
                                .map(emp => (
                                    <div
                                        key={emp.employeeId}
                                        className={`add-member-item ${selectedNewMembers.includes(emp.employeeId) ? 'selected' : ''}`}
                                        onClick={() => toggleNewMember(emp.employeeId)}
                                    >
                                        <div className="add-member-checkbox">
                                            {selectedNewMembers.includes(emp.employeeId) && <span>✓</span>}
                                        </div>
                                        <div className="member-avatar-sm">
                                            {emp.name?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="member-info">
                                            <span className="member-name">{emp.name}</span>
                                            <span className="member-id">{emp.employeeId}</span>
                                        </div>
                                    </div>
                                ))}
                            {getNonMembers().filter(emp => emp.name?.toLowerCase().includes(addMemberSearch.toLowerCase()) || emp.employeeId?.toLowerCase().includes(addMemberSearch.toLowerCase())).length === 0 && (
                                <div className="no-results">No employees found</div>
                            )}
                        </div>
                        <div className="modal-actions">
                            <span className="selected-count-label">{selectedNewMembers.length} selected</span>
                            <button type="button" className="btn-secondary" onClick={() => setShowAddMemberModal(false)}>Cancel</button>
                            <button type="button" className="btn-primary" onClick={handleAddMembers} disabled={selectedNewMembers.length === 0}>Add Members</button>
                        </div>
                    </div>
                </div>
            )}

            {showPollModal && (
                <div className="modal-overlay">
                    <div className="modal-content poll-modal">
                        <div className="modal-header">
                            <h2>Create Poll</h2>
                            <button className="close-btn" onClick={() => setShowPollModal(false)}><FiX /></button>
                        </div>
                        <form onSubmit={handleCreatePoll}>
                            <div className="form-group">
                                <label>Question</label>
                                <input
                                    type="text"
                                    value={pollQuestion}
                                    onChange={(e) => setPollQuestion(e.target.value)}
                                    placeholder="Ask something..."
                                    required
                                />
                            </div>
                            <label>Options</label>
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} className="poll-option-input">
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => updateOption(idx, e.target.value)}
                                        placeholder={`Option ${idx + 1}`}
                                        required
                                    />
                                </div>
                            ))}
                            {pollOptions.length < 5 && (
                                <button type="button" className="btn-text" onClick={handleAddOption}>+ Add Option</button>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowPollModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create Poll</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showTaskModal && (
                <div className="modal-overlay">
                    <div className="modal-content task-modal">
                        <div className="modal-header">
                            <h2>Create New Task</h2>
                            <button className="close-btn" onClick={() => setShowTaskModal(false)}><FiX /></button>
                        </div>
                        <form onSubmit={handleCreateTask}>
                            <div className="form-group">
                                <label>Task Title / Objective</label>
                                <input
                                    type="text"
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    placeholder="What needs to be done?"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Deadline</label>
                                <input
                                    type="date"
                                    value={taskDeadline}
                                    onChange={(e) => setTaskDeadline(e.target.value)}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create & Pin Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
