import React, { useState, useEffect } from 'react';
import { getEmployees, getBranchWorkSummary, getBranches } from '../services/api';
import './WorkTimings.css';
import { FiClock, FiMapPin, FiCalendar, FiUser } from 'react-icons/fi';

const WorkTimings = () => {
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [empRes, branchRes] = await Promise.all([getEmployees(), getBranches()]);
            setEmployees(empRes.employees || []);
            setBranches(branchRes.branches || []);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    const handleFetchSummary = async () => {
        if (!selectedEmployee) return;
        setLoading(true);
        try {
            const res = await getBranchWorkSummary(selectedEmployee, selectedDate);
            if (res.success) {
                setSummary(res.summary || []);
            }
        } catch (error) {
            console.error('Error fetching branch work summary:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedEmployee && selectedDate) {
            handleFetchSummary();
        }
    }, [selectedEmployee, selectedDate]);

    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        try {
            return new Date(isoString).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
        } catch (e) {
            return '--:--';
        }
    };
    const filteredEmployees = selectedBranch === 'all' 
        ? employees 
        : employees.filter(e => e.branchId === selectedBranch);

    return (
        <div className="work-timings-container">
            <header className="page-header">
                <h1>Work Timings</h1>
                <p>View chronological branch-wise work duration for employees.</p>
            </header>

            <div className="filters-card card">
                <div className="filter-group">
                    <label><FiMapPin /> Branch</label>
                    <select value={selectedBranch} onChange={(e) => {
                        setSelectedBranch(e.target.value);
                        setSelectedEmployee(''); // Clear employee on branch change
                    }}>
                        <option value="all">All Branches</option>
                        {branches.map(b => (
                            <option key={b.branchId || b._id} value={b.branchId || b._id}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label><FiUser /> Employee</label>
                    <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                        <option value="">Select Employee</option>
                        {filteredEmployees.map(e => (
                            <option key={e.employeeId} value={e.employeeId}>
                                {e.name} ({e.employeeId})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label><FiCalendar /> Date</label>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="loader"></div>
                    <p>Loading work timings...</p>
                </div>
            ) : summary.length > 0 ? (
                <div className="timeline-wrapper">
                    {summary.map((item, index) => (
                        <div key={index} className={`timeline-entry ${item.type?.toLowerCase() || 'branch'}`}>
                            <div className="timeline-marker"></div>
                            <div className="timeline-card card">
                                <div className="timeline-header">
                                    <div className="title-group">
                                        {item.type === 'TRAVEL' ? (
                                            <FiMapPin className="type-icon travel" />
                                        ) : (
                                            <FiClock className="type-icon branch" />
                                        )}
                                        <h3>{item.branchName}</h3>
                                    </div>
                                    <span className="duration-tag">{item.formattedDuration}</span>
                                </div>
                                <div className="timeline-footer">
                                    <span className="time-range">
                                        <FiClock /> {formatTime(item.startTime)} - {item.endTime ? formatTime(item.endTime) : (item.type === 'TRAVEL' ? 'In Progress' : 'Ongoing')}
                                    </span>
                                    {item.type === 'TRAVEL' && item.status && (
                                        <span className={`status-pill ${item.status.toLowerCase()}`}>
                                            {item.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : selectedEmployee ? (
                <div className="empty-state card">
                    <FiClock size={40} />
                    <p>No branch visits recorded for {selectedDate}.</p>
                </div>
            ) : (
                <div className="empty-state card">
                    <FiUser size={40} />
                    <p>Please select an employee to view their branch-wise work timings.</p>
                </div>
            )}
        </div>
    );
};

export default WorkTimings;
