import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiArrowLeft } from 'react-icons/fi';
import { getEmployeeById, getAttendanceCalendar, getRequestsByEmployee } from '../services/api';
import './AttendanceView.css';

const AttendanceView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [calendarData, setCalendarData] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [requests, setRequests] = useState([]);
    const [activeRequestTab, setActiveRequestTab] = useState(null);

    // Close modal on escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') setSelectedDay(null);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    useEffect(() => {
        loadData();
    }, [id, currentDate]);

    const changeMonth = (increment) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + increment);
            return newDate;
        });
        setLoading(true);
    };

    const loadData = async () => {
        try {
            const [emp, cal, reqs] = await Promise.all([
                getEmployeeById(id),
                getAttendanceCalendar(id, currentDate.getMonth(), currentDate.getFullYear()),
                getRequestsByEmployee(id).catch(() => ({ requests: [] }))
            ]);
            if (emp.success) {
                setEmployee(emp.employee);
            }
            if (cal.success) {
                setCalendarData(cal.days);
            }
            if (reqs.requests) {
                setRequests(reqs.requests);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };


    const renderCalendar = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

        const calendarDays = [];
        for (let i = 0; i < firstDay; i++) calendarDays.push(null);
        for (let i = 1; i <= lastDay; i++) calendarDays.push(i);

        return (
            <div className="calendar-grid">
                <div className="calendar-days-header">
                    {days.map(d => <div key={d} className="day-name">{d}</div>)}
                </div>
                <div className="calendar-dates">
                    {(() => {
                        // Prep empty cells for start of month
                        const firstDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                        const firstDayIndex = firstDayDate.getDay();
                        const empties = Array(firstDayIndex).fill(null);

                        // Merge
                        const allCells = [...empties, ...calendarData];

                        return allCells.map((item, idx) => {
                            if (!item) return <div key={`empty-${idx}`} className="date-cell empty"></div>;

                            return (
                                <div key={item.date} className="date-cell" onClick={() => item.current && setSelectedDay(item)}>
                                    <span className="date-num">{item.day}</span>
                                    <div className="event-stack">
                                        <span className="shift-label">G.Shift</span>
                                        {item.events?.map((e, i) => (
                                            <div key={i} className={`event-tag ${e.type}`}>{e.label}</div>
                                        ))}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div >
        );
    };

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div className="attendance-view-page">
            <div className="page-header" style={{ marginBottom: '20px' }}>
                <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiArrowLeft /> Back to Employees
                </button>
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {employee?.photoUrl && <img src={employee.photoUrl} alt="" className="emp-thumb" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />}
                    <div>
                        <h1 className="page-title" style={{ margin: 0, fontSize: '24px' }}>{employee?.name || employee?.fullName}'s Attendance</h1>
                        <p className="text-muted">{employee?.employeeId} | {employee?.designation}</p>
                    </div>
                </div>
            </div>

            <div className="attendance-layout">
                <div className="main-calendar-section">
                    <div className="calendar-sticky-header">
                        <div className="month-nav">
                            <FiChevronLeft className="nav-icon" onClick={() => changeMonth(-1)} style={{ cursor: 'pointer' }} />
                            <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                            <FiChevronRight className="nav-icon" onClick={() => changeMonth(1)} style={{ cursor: 'pointer' }} />
                        </div>
                    </div>
                    {renderCalendar()}
                </div>

                <div className="sidebar-details-section">
                    <div className="apply-section">
                        <h3 className="section-title">Requests</h3>
                        <div className="apply-actions">
                            <button
                                className={`apply-btn advance ${activeRequestTab === 'ADVANCE' ? 'active' : ''}`}
                                onClick={() => setActiveRequestTab(activeRequestTab === 'ADVANCE' ? null : 'ADVANCE')}
                            >
                                Advance
                                {requests.filter(r => r.type === 'ADVANCE' && r.status === 'Pending').length > 0 && (
                                    <span className="req-badge">
                                        {requests.filter(r => r.type === 'ADVANCE' && r.status === 'Pending').length}
                                    </span>
                                )}
                            </button>
                            <button
                                className={`apply-btn permission ${activeRequestTab === 'PERMISSION' ? 'active' : ''}`}
                                onClick={() => setActiveRequestTab(activeRequestTab === 'PERMISSION' ? null : 'PERMISSION')}
                            >
                                Permission
                                {requests.filter(r => r.type === 'PERMISSION' && r.status === 'Pending').length > 0 && (
                                    <span className="req-badge">
                                        {requests.filter(r => r.type === 'PERMISSION' && r.status === 'Pending').length}
                                    </span>
                                )}
                            </button>
                            <button
                                className={`apply-btn leave ${activeRequestTab === 'LEAVE' ? 'active' : ''}`}
                                onClick={() => setActiveRequestTab(activeRequestTab === 'LEAVE' ? null : 'LEAVE')}
                            >
                                Leave
                                {requests.filter(r => r.type === 'LEAVE' && r.status === 'Pending').length > 0 && (
                                    <span className="req-badge">
                                        {requests.filter(r => r.type === 'LEAVE' && r.status === 'Pending').length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {activeRequestTab && (
                            <div className="requests-list">
                                {requests.filter(r => r.type === activeRequestTab).length > 0 ? (
                                    requests.filter(r => r.type === activeRequestTab).map(req => (
                                        <div key={req.requestId} className="request-item">
                                            <div className="req-header">
                                                <span className="req-date">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </span>
                                                <span className={`req-status ${req.status.toLowerCase()}`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <div className="req-body">
                                                {activeRequestTab === 'ADVANCE' && <div>Amount: ₹{req.data.amount}</div>}
                                                {activeRequestTab === 'LEAVE' && <div>Type: {req.data.leaveType}</div>}
                                                {activeRequestTab === 'PERMISSION' && <div>Time: {req.data.startTime} - {req.data.endTime}</div>}
                                                <div className="req-reason">{req.data.reason}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-requests">No {activeRequestTab.toLowerCase()} requests found.</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="monthly-details">
                        <h3 className="section-title">Monthly Details</h3>

                        <div className="shortfall-table">
                            <div className="sf-header">Short fall</div>
                            <div className="sf-grid">
                                <div>
                                    <label>ExcessStay</label>
                                    <div className="sf-val green">00:48</div>
                                </div>
                                <div>
                                    <label>Shortfall</label>
                                    <div className="sf-val red">00:00</div>
                                </div>
                                <div>
                                    <label>Difference</label>
                                    <div className="sf-val blue">00:48</div>
                                </div>
                            </div>
                        </div>

                        <div className="balance-table-container">
                            <h4 className="table-header-title">Leave Details</h4>
                            <table className="balance-table">
                                <thead>
                                    <tr>
                                        <th>Leave</th>
                                        <th>Open</th>
                                        <th>Cr</th>
                                        <th>Used</th>
                                        <th>Bal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(employee?.leaveBalances || [
                                        { type: 'Medical Leave', opening: 2, credit: 0, used: 0, balance: 2 },
                                        { type: 'Casual Leave', opening: 2, credit: 0, used: 0, balance: 2 },
                                    ]).filter(l => l.type !== 'Spell Leave').map((l, i) => (
                                        <tr key={i}>
                                            <td>{l.type}</td>
                                            <td>{l.opening}</td>
                                            <td>{l.credit}</td>
                                            <td>{l.used}</td>
                                            <td className="bold">{l.balance}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>


                    </div>
                </div>
            </div>


            {/* Attendance Details Modal */}
            {
                selectedDay && (
                    <div className="attendance-modal-overlay" onClick={() => setSelectedDay(null)}>
                        <div className="attendance-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>{new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                                <button className="close-btn" onClick={() => setSelectedDay(null)}>&times;</button>
                            </div>
                            <div className="modal-body">
                                {selectedDay.details ? (
                                    <>
                                        <div className="detail-times-grid">
                                            <div className="time-box">
                                                <span className="label">Check In</span>
                                                <span className="value in-time">{selectedDay.details.checkIn}</span>
                                            </div>
                                            <div className="time-box">
                                                <span className="label">Check Out</span>
                                                <span className="value out-time">{selectedDay.details.checkOut}</span>
                                            </div>
                                        </div>
                                        <div className="duration-banner">
                                            <span className="icon">⏱</span>
                                            <span>Total Work Time: <strong>{selectedDay.details.duration}</strong></span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="no-data-msg">
                                        No working hours recorded for this day.
                                    </div>
                                )}

                                {/* Tags */}
                                <div className="modal-tags">
                                    {selectedDay.events?.map((e, i) => (
                                        <span key={i} className={`event-tag large ${e.type}`}>{e.label}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AttendanceView;
