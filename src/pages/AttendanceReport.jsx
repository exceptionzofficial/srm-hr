import React, { useState, useEffect } from 'react';
import { getAttendanceReport, getBranches, getBranchById, getPayGroups, getEmployees } from '../services/api';
import { 
    FiBarChart2, FiDownload, FiRefreshCw, FiList, FiMapPin, FiLayers, 
    FiUserX, FiNavigation, FiUsers, FiCheckCircle, FiXCircle, FiClock,
    FiHome, FiBriefcase, FiMap
} from 'react-icons/fi';
import { MdFlight } from 'react-icons/md';
import './AttendanceReport.css';

const AttendanceReport = () => {
    const today = new Date().toISOString().split('T')[0];

    // Report Type (date mode)
    const [reportType, setReportType] = useState('daily');
    const [date, setDate] = useState(today);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    // Active view tab
    const [activeTab, setActiveTab] = useState('daily'); // daily | branch | paygroup | absent | travel | range

    // Data
    const [report, setReport] = useState([]);
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [branches, setBranches] = useState([]);
    const [payGroups, setPayGroups] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [branchDetails, setBranchDetails] = useState(null);

    // Load branches, paygroups, employees on mount
    useEffect(() => {
        const loadMeta = async () => {
            try {
                const [brRes, pgRes, empRes] = await Promise.all([
                    getBranches(),
                    getPayGroups(),
                    getEmployees(),
                ]);
                if (brRes?.branches) setBranches(brRes.branches);
                if (pgRes?.payGroups) setPayGroups(pgRes.payGroups);
                if (empRes?.employees) setEmployees(empRes.employees);
            } catch (e) {
                console.error('Failed to load metadata', e);
            }
        };
        loadMeta();
    }, []);

    // Auto-set dates when type changes
    useEffect(() => {
        const now = new Date();
        if (reportType === 'weekly') {
            const end = now.toISOString().split('T')[0];
            const start = new Date(now.setDate(now.getDate() - 6)).toISOString().split('T')[0];
            setStartDate(start); setEndDate(end);
        } else if (reportType === 'monthly') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            setStartDate(start); setEndDate(end);
        } else if (reportType === 'daily') {
            setDate(today);
        }
    }, [reportType]);

    // Sync active tab with report type
    useEffect(() => {
        if (['weekly', 'monthly', 'custom'].includes(reportType)) {
            setActiveTab('range');
        }
    }, [reportType]);

    // Auto-load on mount
    useEffect(() => { handleGenerate(); }, []);

    const handleGenerate = async () => {
        try {
            setLoading(true);
            setFetched(false);
            setReport([]);
            setBranchDetails(null);

            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = user.role || '';
            const userBranchId = user.branchId;
            const allowedAdminRoles = ['HR', 'SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'];

            let queryBranchId = null;
            if (!allowedAdminRoles.includes(userRole) && userBranchId) {
                queryBranchId = userBranchId;
            }

            if (queryBranchId) {
                try {
                    const bDetails = await getBranchById(queryBranchId);
                    if (bDetails?.branch) setBranchDetails(bDetails.branch);
                } catch (e) { console.error(e); }
            }

            let params = {};
            if (reportType === 'daily') {
                params = { date };
            } else {
                params = { startDate, endDate };
            }

            if (queryBranchId) params.branchId = queryBranchId;
            else if (selectedBranch) params.branchId = selectedBranch;

            const response = await getAttendanceReport(params);
            if (response.success) {
                if (response.type === 'range') {
                    setReport(response.report || []);
                    setSummaryData({ totalDays: response.report[0]?.stats?.totalDays || 0, startDate: response.startDate, endDate: response.endDate });
                } else {
                    setReport(response.report || []);
                    setSummaryData(null);
                }
            }
            setFetched(true);
        } catch (error) {
            console.error('Error generating report', error);
            alert('Error generating report');
        } finally {
            setLoading(false);
        }
    };

    // ── Derived / filtered data ──────────────────────────────────────
    const getBranchName = (branchId) => branches.find(b => b.branchId === branchId)?.name || 'Unassigned';

    const absentRows = report.filter(r => Array.isArray(r.status) ? r.status.includes('Absent') : r.status === 'Absent');
    const travelRows = report.filter(r => Array.isArray(r.status) ? r.status.includes('On Travel') : r.status === 'On Travel');

    // Branch-wise grouping for daily view
    const branchGrouped = (() => {
        const map = {};
        report.forEach(row => {
            const bid = row.branchId || 'unassigned';
            if (!map[bid]) map[bid] = { branchId: bid, name: getBranchName(bid), rows: [], present: 0, absent: 0, lateIn: 0, travel: 0 };
            map[bid].rows.push(row);
            const st = Array.isArray(row.status) ? row.status : [row.status];
            if (st.includes('Present') || st.includes('Late in')) map[bid].present++;
            if (st.includes('Absent')) map[bid].absent++;
            if (st.includes('Late in')) map[bid].lateIn++;
            if (st.includes('On Travel')) map[bid].travel++;
        });
        return Object.values(map);
    })();

    // Paygroup-wise grouping
    const paygroupGrouped = (() => {
        const empPayGroupMap = {};
        employees.forEach(e => { empPayGroupMap[e.employeeId] = e.payGroup || 'Unassigned'; });
        const map = {};
        report.forEach(row => {
            const pg = empPayGroupMap[row.employeeId] || 'Unassigned';
            // Find paygroup label
            const pgObj = payGroups.find(p => p.id === pg || p.name === pg);
            const pgLabel = pgObj ? (pgObj.name || pg) : pg;
            if (!map[pgLabel]) map[pgLabel] = { name: pgLabel, rows: [], present: 0, absent: 0, lateIn: 0, travel: 0 };
            map[pgLabel].rows.push(row);
            const st = Array.isArray(row.status) ? row.status : [row.status];
            if (st.includes('Present') || st.includes('Late in')) map[pgLabel].present++;
            if (st.includes('Absent')) map[pgLabel].absent++;
            if (st.includes('Late in')) map[pgLabel].lateIn++;
            if (st.includes('On Travel')) map[pgLabel].travel++;
        });
        return Object.values(map);
    })();

    // ── Summary cards ─────────────────────────────────────────────────
    const totalPresent = report.filter(r => {
        const st = Array.isArray(r.status) ? r.status : [r.status];
        return st.includes('Present') || st.includes('Late in');
    }).length;
    const totalAbsent = absentRows.length;
    const totalLate = report.filter(r => { const st = Array.isArray(r.status) ? r.status : [r.status]; return st.includes('Late in'); }).length;
    const totalTravel = travelRows.length;

    // ── Helpers ──────────────────────────────────────────────────────
    const formatMinutes = (m) => {
        if (!m || m <= 0) return '-';
        return `${Math.floor(m / 60)}h ${m % 60}m`;
    };
    const formatTime = (iso) => {
        if (!iso || iso === '-') return '-';
        try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return iso; }
    };
    const getStatusBadge = (statusList) => {
        if (!statusList) return null;
        const list = Array.isArray(statusList) ? statusList : [statusList];
        return (
            <div className="status-container">
                {list.map((s, i) => (
                    <span key={i} className={`status-tag ${s.toLowerCase().replace(/\s+/g, '-')}`}>{s}</span>
                ))}
            </div>
        );
    };

    // ── CSV Download ──────────────────────────────────────────────────
    const downloadCSV = () => {
        try {
            let headers = [], rows = [], filename = '';

            if (activeTab === 'daily') {
                headers = ['Employee ID', 'Name', 'Branch', 'Department', 'In Time', 'Out Time', 'Duration', 'Status', 'Remarks'];
                rows = report.map(r => [r.employeeId, `"${(r.name||'').replace(/"/g,'""')}"`, `"${getBranchName(r.branchId)}"`, r.department||'', formatTime(r.times?.in), formatTime(r.times?.out), formatMinutes(r.totalWorkMinutes), Array.isArray(r.status)?r.status.join('|'):r.status, `"${(r.remarks||'').replace(/"/g,'""')}"`]);
                filename = `daily_report_${date}.csv`;
            } else if (activeTab === 'absent') {
                headers = ['Employee ID', 'Name', 'Branch', 'Department', 'Remarks'];
                rows = absentRows.map(r => [r.employeeId, `"${(r.name||'').replace(/"/g,'""')}"`, `"${getBranchName(r.branchId)}"`, r.department||'', `"${(r.remarks||'').replace(/"/g,'""')}"`]);
                filename = `absent_report_${date}.csv`;
            } else if (activeTab === 'travel') {
                headers = ['Employee ID', 'Name', 'Branch', 'Department', 'In Time', 'Out Time'];
                rows = travelRows.map(r => [r.employeeId, `"${(r.name||'').replace(/"/g,'""')}"`, `"${getBranchName(r.branchId)}"`, r.department||'', formatTime(r.times?.in), formatTime(r.times?.out)]);
                filename = `travel_report_${date}.csv`;
            } else if (activeTab === 'branch') {
                headers = ['Branch', 'Total', 'Present', 'Absent', 'Late In', 'On Travel'];
                rows = branchGrouped.map(g => [g.name, g.rows.length, g.present, g.absent, g.lateIn, g.travel]);
                filename = `branchwise_report_${date}.csv`;
            } else if (activeTab === 'paygroup') {
                headers = ['Pay Group', 'Total', 'Present', 'Absent', 'Late In', 'On Travel'];
                rows = paygroupGrouped.map(g => [g.name, g.rows.length, g.present, g.absent, g.lateIn, g.travel]);
                filename = `paygroup_report_${date}.csv`;
            } else if (activeTab === 'range') {
                headers = ['Employee ID', 'Name', 'Branch', 'Department', 'Present', 'Absent', 'Late In', 'Early Out', 'Leaves', 'Permissions', 'Travel'];
                rows = report.map(r => [r.employeeId, `"${(r.name||'').replace(/"/g,'""')}"`, `"${getBranchName(r.branchId)}"`, r.department||'', r.stats?.present||0, r.stats?.absent||0, r.stats?.lateIn||0, r.stats?.earlyOut||0, r.stats?.leave||0, r.stats?.permission||0, r.stats?.travel||0]);
                filename = `attendance_summary_${startDate}_to_${endDate}.csv`;
            }

            const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error(e);
            alert('Failed to download CSV.');
        }
    };

    const isRangeMode = ['weekly', 'monthly', 'custom'].includes(reportType);

    // ── Tab definitions ───────────────────────────────────────────────
    const TABS = isRangeMode
        ? [{ id: 'range', icon: <FiBarChart2 />, label: 'Summary' }]
        : [
            { id: 'daily',    icon: <FiList />,    label: 'Daily' },
            { id: 'branch',   icon: <FiMap />,     label: 'Branch-wise' },
            { id: 'paygroup', icon: <FiLayers />,  label: 'Paygroup-wise' },
            { id: 'absent',   icon: <FiUserX />,   label: 'Absent' },
            { id: 'travel',   icon: <MdFlight />,  label: 'Travel' },
        ];

    return (
        <div className="attendance-report-page">
            {/* Header */}
            <div className="section-header">
                <div className="section-title">
                    <FiBarChart2 />
                    <h2>Attendance Reports</h2>
                </div>
            </div>

            {/* Controls */}
            <div className="report-controls">
                <div className="control-group">
                    <label>Report Type:</label>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="type-select">
                        <option value="daily">Daily Report</option>
                        <option value="weekly">Weekly Summary</option>
                        <option value="monthly">Monthly Summary</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>

                <div className="control-group">
                    <label>Branch:</label>
                    <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="type-select">
                        <option value="">All Branches</option>
                        {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                    </select>
                </div>

                {reportType === 'daily' ? (
                    <div className="control-group">
                        <label>Date:</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="date-picker" />
                    </div>
                ) : (
                    <>
                        <div className="control-group">
                            <label>From:</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-picker" disabled={reportType !== 'custom'} />
                        </div>
                        <div className="control-group">
                            <label>To:</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="date-picker" disabled={reportType !== 'custom'} />
                        </div>
                    </>
                )}

                <div className="button-group">
                    <button onClick={handleGenerate} className="generate-btn" disabled={loading}>
                        <FiRefreshCw style={{ marginRight: 6 }} />
                        {loading ? 'Generating...' : 'Generate'}
                    </button>
                    {fetched && report.length > 0 && (
                        <button onClick={downloadCSV} className="download-btn">
                            <FiDownload style={{ marginRight: 6 }} /> Download CSV
                        </button>
                    )}
                </div>
            </div>

            {/* Branch isolation card */}
            {branchDetails && (
                <div className="branch-details-card">
                    <strong>📍 Branch:</strong> {branchDetails.name}
                    <span style={{ marginLeft: 20 }}>Lat: {branchDetails.latitude}</span>
                    <span style={{ marginLeft: 10 }}>Lng: {branchDetails.longitude}</span>
                    <span style={{ marginLeft: 10 }}>Radius: {branchDetails.radiusMeters || 100}m</span>
                </div>
            )}

            {/* ── Results ── */}
            {fetched && (
                <div className="report-results">
                    {/* Summary cards */}
                    {!isRangeMode ? (
                        <div className="summary-cards">
                            <div className="summary-card total">
                                <div className="card-icon"><FiUsers /></div>
                                <div className="card-content">
                                    <h3>Total</h3>
                                    <p>{report.length}</p>
                                </div>
                            </div>
                            <div className="summary-card present">
                                <div className="card-icon"><FiCheckCircle /></div>
                                <div className="card-content">
                                    <h3>Present</h3>
                                    <p>{totalPresent}</p>
                                </div>
                            </div>
                            <div className="summary-card absent">
                                <div className="card-icon"><FiXCircle /></div>
                                <div className="card-content">
                                    <h3>Absent</h3>
                                    <p>{totalAbsent}</p>
                                </div>
                            </div>
                            <div className="summary-card late">
                                <div className="card-icon"><FiClock /></div>
                                <div className="card-content">
                                    <h3>Late In</h3>
                                    <p>{totalLate}</p>
                                </div>
                            </div>
                            <div className="summary-card travel">
                                <div className="card-icon"><MdFlight /></div>
                                <div className="card-content">
                                    <h3>On Travel</h3>
                                    <p>{totalTravel}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="summary-cards">
                            <div className="summary-card period">
                                <div className="card-icon"><FiClock /></div>
                                <div className="card-content">
                                    <h3>Period</h3>
                                    <p style={{ fontSize: 13 }}>{startDate} — {endDate}</p>
                                </div>
                            </div>
                            <div className="summary-card total">
                                <div className="card-icon"><FiUsers /></div>
                                <div className="card-content">
                                    <h3>Employees</h3>
                                    <p>{report.length}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Bar */}
                    <div className="report-tabs">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(t.id)}
                            >
                                <span className="tab-icon">{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Tab: Daily ── */}
                    {activeTab === 'daily' && (
                        <div className="table-container">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Branch</th>
                                        <th>Department</th>
                                        <th>In Time</th>
                                        <th>Out Time</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.length > 0 ? report.map(row => (
                                        <tr key={row.employeeId}>
                                            <td className="employee-cell">
                                                <div className="emp-name">{row.name}</div>
                                                <div className="emp-id">{row.employeeId}</div>
                                            </td>
                                            <td>{getBranchName(row.branchId)}</td>
                                            <td>{row.department || '-'}</td>
                                            <td>{formatTime(row.times?.in)}</td>
                                            <td>{formatTime(row.times?.out)}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatMinutes(row.totalWorkMinutes)}</td>
                                            <td>{getStatusBadge(row.status)}</td>
                                            <td>{row.remarks || '-'}</td>
                                        </tr>
                                    )) : <tr><td colSpan={8} className="no-data">No records found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Tab: Branch-wise ── */}
                    {activeTab === 'branch' && (
                        <div className="table-container">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Branch</th>
                                        <th>Total Employees</th>
                                        <th>Present</th>
                                        <th>Absent</th>
                                        <th>Late In</th>
                                        <th>On Travel</th>
                                        <th>Attendance %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchGrouped.length > 0 ? branchGrouped.map(g => (
                                        <tr key={g.branchId}>
                                            <td style={{ fontWeight: 700 }}>{g.name}</td>
                                            <td>{g.rows.length}</td>
                                            <td className="color-success">{g.present}</td>
                                            <td className="color-danger">{g.absent}</td>
                                            <td className="color-warning">{g.lateIn}</td>
                                            <td className="color-primary">{g.travel}</td>
                                            <td>
                                                <div className="progress-bar-wrap">
                                                    <div className="progress-bar-fill" style={{ width: `${g.rows.length ? Math.round((g.present / g.rows.length) * 100) : 0}%` }} />
                                                    <span className="progress-label">{g.rows.length ? Math.round((g.present / g.rows.length) * 100) : 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan={7} className="no-data">No branch data found.</td></tr>}
                                </tbody>
                            </table>

                            {/* Per-branch detail tables */}
                            {branchGrouped.map(g => (
                                <div key={g.branchId} className="branch-detail-block">
                                    <div className="branch-detail-header">
                                        <span><FiHome style={{ verticalAlign: 'middle', marginRight: 6 }} /> {g.name}</span>
                                        <span className="branch-detail-count">{g.rows.length} employees</span>
                                    </div>
                                    <table className="report-table">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Department</th>
                                                <th>In Time</th>
                                                <th>Out Time</th>
                                                <th>Duration</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {g.rows.map(row => (
                                                <tr key={row.employeeId}>
                                                    <td className="employee-cell">
                                                        <div className="emp-name">{row.name}</div>
                                                        <div className="emp-id">{row.employeeId}</div>
                                                    </td>
                                                    <td>{row.department || '-'}</td>
                                                    <td>{formatTime(row.times?.in)}</td>
                                                    <td>{formatTime(row.times?.out)}</td>
                                                    <td>{formatMinutes(row.totalWorkMinutes)}</td>
                                                    <td>{getStatusBadge(row.status)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Tab: Paygroup-wise ── */}
                    {activeTab === 'paygroup' && (
                        <div className="table-container">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Pay Group</th>
                                        <th>Total Employees</th>
                                        <th>Present</th>
                                        <th>Absent</th>
                                        <th>Late In</th>
                                        <th>On Travel</th>
                                        <th>Attendance %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paygroupGrouped.length > 0 ? paygroupGrouped.map(g => (
                                        <tr key={g.name}>
                                            <td style={{ fontWeight: 700 }}>{g.name}</td>
                                            <td>{g.rows.length}</td>
                                            <td className="color-success">{g.present}</td>
                                            <td className="color-danger">{g.absent}</td>
                                            <td className="color-warning">{g.lateIn}</td>
                                            <td className="color-primary">{g.travel}</td>
                                            <td>
                                                <div className="progress-bar-wrap">
                                                    <div className="progress-bar-fill" style={{ width: `${g.rows.length ? Math.round((g.present / g.rows.length) * 100) : 0}%` }} />
                                                    <span className="progress-label">{g.rows.length ? Math.round((g.present / g.rows.length) * 100) : 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan={7} className="no-data">No paygroup data found.</td></tr>}
                                </tbody>
                            </table>

                            {/* Per-paygroup detail tables */}
                            {paygroupGrouped.map(g => (
                                <div key={g.name} className="branch-detail-block">
                                    <div className="branch-detail-header">
                                        <span><FiBriefcase style={{ verticalAlign: 'middle', marginRight: 6 }} /> {g.name}</span>
                                        <span className="branch-detail-count">{g.rows.length} employees</span>
                                    </div>
                                    <table className="report-table">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Branch</th>
                                                <th>Department</th>
                                                <th>In Time</th>
                                                <th>Out Time</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {g.rows.map(row => (
                                                <tr key={row.employeeId}>
                                                    <td className="employee-cell">
                                                        <div className="emp-name">{row.name}</div>
                                                        <div className="emp-id">{row.employeeId}</div>
                                                    </td>
                                                    <td>{getBranchName(row.branchId)}</td>
                                                    <td>{row.department || '-'}</td>
                                                    <td>{formatTime(row.times?.in)}</td>
                                                    <td>{formatTime(row.times?.out)}</td>
                                                    <td>{getStatusBadge(row.status)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Tab: Absent ── */}
                    {activeTab === 'absent' && (
                        <div className="table-container">
                            <div className="absent-banner">
                                <FiXCircle /> {absentRows.length} employee{absentRows.length !== 1 ? 's' : ''} absent on {date}
                            </div>
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Branch</th>
                                        <th>Department</th>
                                        <th>Status</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {absentRows.length > 0 ? absentRows.map(row => (
                                        <tr key={row.employeeId} className="absent-row">
                                            <td className="employee-cell">
                                                <div className="emp-name">{row.name}</div>
                                                <div className="emp-id">{row.employeeId}</div>
                                            </td>
                                            <td>{getBranchName(row.branchId)}</td>
                                            <td>{row.department || '-'}</td>
                                            <td>{getStatusBadge(row.status)}</td>
                                            <td>{row.remarks || 'No Check-in'}</td>
                                        </tr>
                                    )) : <tr><td colSpan={5} className="no-data">No absent employees.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Tab: Travel ── */}
                    {activeTab === 'travel' && (
                        <div className="table-container">
                            <div className="travel-banner">
                                <FiNavigation /> {travelRows.length} employee{travelRows.length !== 1 ? 's' : ''} on travel on {date}
                            </div>
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Branch</th>
                                        <th>Department</th>
                                        <th>In Time</th>
                                        <th>Out Time</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {travelRows.length > 0 ? travelRows.map(row => (
                                        <tr key={row.employeeId} className="travel-row">
                                            <td className="employee-cell">
                                                <div className="emp-name">{row.name}</div>
                                                <div className="emp-id">{row.employeeId}</div>
                                            </td>
                                            <td>{getBranchName(row.branchId)}</td>
                                            <td>{row.department || '-'}</td>
                                            <td>{formatTime(row.times?.in)}</td>
                                            <td>{formatTime(row.times?.out)}</td>
                                            <td className="color-primary">{formatMinutes(row.totalWorkMinutes)}</td>
                                            <td>{getStatusBadge(row.status)}</td>
                                            <td>{row.remarks || '-'}</td>
                                        </tr>
                                    )) : <tr><td colSpan={8} className="no-data">No travel records found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Tab: Range Summary ── */}
                    {activeTab === 'range' && (
                        <div className="table-container">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Branch</th>
                                        <th>Present</th>
                                        <th>Absent</th>
                                        <th>Late In</th>
                                        <th>Early Out</th>
                                        <th>Leaves</th>
                                        <th>Permissions</th>
                                        <th>Travel</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.length > 0 ? report.map(row => (
                                        <tr key={row.employeeId}>
                                            <td className="employee-cell">
                                                <div className="emp-name">{row.name}</div>
                                                <div className="emp-id">{row.employeeId}</div>
                                            </td>
                                            <td>{getBranchName(row.branchId)}</td>
                                            <td className="color-success">{row.stats?.present || 0}</td>
                                            <td className="color-danger">{row.stats?.absent || 0}</td>
                                            <td className="color-warning">{row.stats?.lateIn || 0}</td>
                                            <td>{row.stats?.earlyOut || 0}</td>
                                            <td className="color-info">{row.stats?.leave || 0}</td>
                                            <td>{row.stats?.permission || 0}</td>
                                            <td className="color-primary">{row.stats?.travel || 0}</td>
                                        </tr>
                                    )) : <tr><td colSpan={9} className="no-data">No records found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AttendanceReport;
