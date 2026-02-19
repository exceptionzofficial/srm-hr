import { useState, useEffect } from 'react';
import { getAttendanceReport, getBranchById } from '../services/api';
import './AttendanceReport.css'; // Reusing the same CSS

const MobileAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    const [reportType, setReportType] = useState('daily'); // daily, weekly, monthly, custom
    const [date, setDate] = useState(today);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    const [report, setReport] = useState([]);
    const [summaryData, setSummaryData] = useState(null); // For range reports
    const [debugInfo, setDebugInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [branchDetails, setBranchDetails] = useState(null);

    // Auto-set dates when type changes
    useEffect(() => {
        const now = new Date();
        if (reportType === 'weekly') {
            // Last 7 Days
            const end = now.toISOString().split('T')[0];
            const start = new Date(now.setDate(now.getDate() - 6)).toISOString().split('T')[0];
            setStartDate(start);
            setEndDate(end);
        } else if (reportType === 'monthly') {
            // This Month
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            setStartDate(start);
            setEndDate(end);
        } else if (reportType === 'daily') {
            setDate(today);
        }
    }, [reportType]);

    const isKiosk = (emp) => {
        return (
            emp.employeeType === 'kiosk' ||
            emp.platformAccess === 'Kiosk' ||
            emp.employeeId?.startsWith('SRMC')
        );
    };

    const handleGenerate = async () => {
        try {
            setLoading(true);
            setFetched(false);
            setDebugInfo(null);
            setReport([]);
            setBranchDetails(null);

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

            if (queryBranchId) {
                try {
                    const bDetails = await getBranchById(queryBranchId);
                    if (bDetails && bDetails.branch) {
                        setBranchDetails(bDetails.branch);
                    }
                } catch (e) {
                    console.error("Failed to fetch branch details", e);
                }
            }

            let params = {};
            if (reportType === 'daily') {
                params = { date };
            } else {
                params = { startDate, endDate };
            }

            if (queryBranchId) {
                params.branchId = queryBranchId;
            }

            console.log("Generating Mobile Report with params:", params);

            const response = await getAttendanceReport(params);

            if (response.success) {
                let reportData = response.report || [];

                // FILTER FOR MOBILE ONLY
                reportData = reportData.filter(emp => !isKiosk(emp));

                if (response.type === 'range') {
                    setReport(reportData);
                    setSummaryData({
                        totalDays: response.report[0]?.stats?.totalDays || 0,
                        startDate: response.startDate,
                        endDate: response.endDate
                    });
                } else {
                    setReport(reportData);
                    setSummaryData(null);
                }

                if (response.debug) {
                    setDebugInfo(response.debug);
                }
            }
            setFetched(true);
        } catch (error) {
            console.error("Error generating report", error);
            alert("Error generating report");
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        try {
            if (!report || report.length === 0) return;

            let csvContent = "";
            const isRange = reportType !== 'daily' && summaryData;

            if (isRange) {
                const headers = ['Employee ID', 'Name', 'Department', 'Total Days', 'Present', 'Absent', 'Late In', 'Early Out', 'Leave', 'Permission', 'Half Day'];
                const rows = report.map(row => {
                    const stats = row.stats;
                    const name = `"${(row.name || '').replace(/"/g, '""')}"`;
                    const dept = (row.department || '').replace(/,/g, ' ');

                    return [
                        row.employeeId,
                        name,
                        dept,
                        stats.totalDays,
                        stats.present,
                        stats.absent,
                        stats.lateIn,
                        stats.earlyOut,
                        stats.leave,
                        stats.permission,
                        stats.halfDay
                    ].join(',');
                });
                csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
            } else {
                const headers = ['Employee ID', 'Name', 'Department', 'In Time', 'Out Time', 'Status', 'Remarks'];
                const rows = report.map(row => {
                    const statusStr = Array.isArray(row.status) ? row.status.join(' | ') : (row.status || '');
                    const name = `"${(row.name || '').replace(/"/g, '""')}"`;
                    const remarks = `"${(row.remarks || '').replace(/"/g, '""')}"`;
                    const dept = (row.department || '').replace(/,/g, ' ');

                    return [
                        row.employeeId,
                        name,
                        dept,
                        row.times?.in || '-',
                        row.times?.out || '-',
                        statusStr,
                        remarks
                    ].join(',');
                });
                csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fileName = isRange ? `mobile_attendance_summary_${startDate}_to_${endDate}.csv` : `mobile_attendance_report_${date}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading CSV:", error);
            alert("Failed to download CSV.");
        }
    };

    const getStatusBadge = (statusList, color) => {
        if (!statusList) return null;
        return (
            <div className="status-container">
                {statusList.map((s, i) => (
                    <span key={i} className={`status-tag ${s.toLowerCase().replace(/\s+/g, '-')}`}>
                        {s}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="attendance-report-page">
            <div className="page-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📱 Mobile Attendance Report
                </h1>
            </div>

            <div className="report-controls">
                <div className="control-group">
                    <label>Report Type:</label>
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="type-select"
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                        <option value="daily">Daily Report</option>
                        <option value="weekly">Weekly Summary</option>
                        <option value="monthly">Monthly Summary</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>

                {reportType === 'daily' ? (
                    <div className="control-group">
                        <label>Select Date:</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="date-picker"
                        />
                    </div>
                ) : (
                    <>
                        <div className="control-group">
                            <label>From:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="date-picker"
                                disabled={reportType !== 'custom'}
                            />
                        </div>
                        <div className="control-group">
                            <label>To:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="date-picker"
                                disabled={reportType !== 'custom'}
                            />
                        </div>
                    </>
                )}

                <div className="button-group">
                    <button onClick={handleGenerate} className="generate-btn" disabled={loading}>
                        {loading ? 'Generating...' : 'Generate Report'}
                    </button>
                    {fetched && report.length > 0 && (
                        <button onClick={downloadCSV} className="download-btn">
                            Download CSV
                        </button>
                    )}
                </div>
            </div>


            {branchDetails && (
                <div className="branch-details-card" style={{ marginBottom: '20px', padding: '15px', background: '#e0f2fe', borderRadius: '8px', border: '1px solid #bae6fd', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div>
                        <strong>Assigned Branch:</strong> {branchDetails.name}
                    </div>
                </div>
            )}

            {fetched && (
                <div className="report-results">
                    {/* Summary Cards */}
                    {reportType === 'daily' ? (
                        <div className="summary-cards">
                            <div className="card">
                                <h3>Total Mobile Employees</h3>
                                <p>{report.length}</p>
                            </div>
                            <div className="card">
                                <h3>Present</h3>
                                <p>{report.filter(r => r.status.includes('Present') || r.status.includes('Late in')).length}</p>
                            </div>
                            <div className="card">
                                <h3>Absent</h3>
                                <p>{report.filter(r => r.status.includes('Absent')).length}</p>
                            </div>
                            <div className="card">
                                <h3>Late In</h3>
                                <p>{report.filter(r => r.status.includes('Late in')).length}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="summary-cards">
                            <div className="card">
                                <h3>Period</h3>
                                <p style={{ fontSize: '16px' }}>{startDate} to {endDate}</p>
                            </div>
                            <div className="card">
                                <h3>Total Mobile Employees</h3>
                                <p>{report.length}</p>
                            </div>
                        </div>
                    )}

                    <div className="table-container">
                        {reportType === 'daily' ? (
                            /* DAILY TABLE */
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Department</th>
                                        <th>In Time</th>
                                        <th>Out Time</th>
                                        <th>Status</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.length > 0 ? (
                                        report.map((row) => (
                                            <tr key={row.employeeId}>
                                                <td className="employee-cell">
                                                    <div className="emp-name">{row.name}</div>
                                                    <div className="emp-id">{row.employeeId}</div>
                                                </td>
                                                <td>{row.department || '-'}</td>
                                                <td>{row.times?.in || '-'}</td>
                                                <td>{row.times?.out || '-'}</td>
                                                <td>{getStatusBadge(row.status, row.color)}</td>
                                                <td>{row.remarks || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="no-data">No mobile records found for this period.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            /* SUMMARY TABLE */
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Present</th>
                                        <th>Absent</th>
                                        <th>Late In</th>
                                        <th>Early Out</th>
                                        <th>Leaves</th>
                                        <th>Permissions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.length > 0 ? (
                                        report.map((row) => (
                                            <tr key={row.employeeId}>
                                                <td className="employee-cell">
                                                    <div className="emp-name">{row.name}</div>
                                                    <div className="emp-id">{row.employeeId}</div>
                                                </td>
                                                <td style={{ color: '#047857', fontWeight: 'bold' }}>{row.stats?.present || 0}</td>
                                                <td style={{ color: '#b91c1c', fontWeight: 'bold' }}>{row.stats?.absent || 0}</td>
                                                <td style={{ color: '#c2410c' }}>{row.stats?.lateIn || 0}</td>
                                                <td>{row.stats?.earlyOut || 0}</td>
                                                <td style={{ color: '#1d4ed8' }}>{row.stats?.leave || 0}</td>
                                                <td>{row.stats?.permission || 0}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="7" className="no-data">No mobile records found for this period.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileAttendance;
