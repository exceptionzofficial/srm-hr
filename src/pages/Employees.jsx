import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiSearch, FiEdit2, FiTrash2, FiPlus, FiMapPin, FiUser, FiCreditCard } from 'react-icons/fi';
import { getEmployees, deleteEmployee, getBranches } from '../services/api';
import './Employees.css';

const Employees = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Determine Branch Context based on Role
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = user.role || '';
            const userBranchId = user.branchId;

            // Define Admin Roles (can see everything)
            const allowedAdminRoles = ['HR', 'SUPER_ADMIN', 'ADMIN'];

            let queryBranchId = null;

            // If NOT an admin role, enforce branch isolation
            if (!allowedAdminRoles.includes(userRole)) {
                if (userBranchId) {
                    queryBranchId = userBranchId;
                }
            }

            // Fetch Employees (passing branchId if isolated)
            const empResponse = await getEmployees(queryBranchId);
            setEmployees(empResponse.employees || []);

            const branchResponse = await getBranches().catch(() => ({ branches: [] }));
            setBranches(branchResponse.branches || []);
        } catch (error) {
            console.error('Error loading data:', error);
            setError('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (employeeId) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;
        try {
            await deleteEmployee(employeeId);
            setSuccess('Employee deleted successfully');
            loadData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.message || 'Error deleting employee');
        }
    };

    const getBranchName = (branchId) => {
        const branch = branches.find(b => b.branchId === branchId);
        return branch?.name || '-';
    };

    const filteredEmployees = employees
        .filter(emp => {
            const searchLower = searchTerm.toLowerCase();
            return (
                emp.name?.toLowerCase().includes(searchLower) ||
                emp.employeeId?.toLowerCase().includes(searchLower) ||
                emp.associateCode?.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    // Split based on employeeType, platformAccess, or ID prefix (SRMC indicates Kiosk)
    const isKiosk = (emp) => {
        return (
            emp.employeeType === 'kiosk' ||
            emp.platformAccess === 'Kiosk' ||
            emp.employeeId?.startsWith('SRMC')
        );
    };

    const mobileEmployees = filteredEmployees.filter(emp => !isKiosk(emp));
    const kioskEmployees = filteredEmployees.filter(emp => isKiosk(emp));

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    return (
        <div className="employees-page fade-in">
            <div className="section-header mb-8">
                <div className="section-title">
                    <FiSearch />
                    <h2>Employee Directory</h2>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="search-container w-80">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Find an employee..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/employee/add')}>
                        <FiPlus /> Add Employee
                    </button>
                </div>
            </div>

            {success && <div className="badge badge-success justify-center" style={{ width: '100%', padding: '12px', marginBottom: '16px' }}>{success}</div>}
            {error && <div className="badge badge-danger justify-center" style={{ width: '100%', padding: '12px', marginBottom: '16px' }}>{error}</div>}


            {/* Mobile App Employees Section */}
            <div className="branch-header-premium mt-0 mb-4">
                <div className="branch-label">
                    <span>📱 Mobile App Employees</span>
                </div>
                <div className="branch-count">
                    {mobileEmployees.length} active members
                </div>
            </div>

            <div className="card p-0 overflow-hidden mb-10">
                {mobileEmployees.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '120px' }}>ID & Code</th>
                                    <th>Employee Details</th>
                                    <th>Work Mode</th>
                                    <th>Location & Finance</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center', width: '100px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mobileEmployees.map((emp) => (
                                    <tr
                                        key={emp.employeeId}
                                        onClick={() => navigate(`/attendance/view/${emp.employeeId}`)}
                                        className="employee-card-row"
                                    >
                                        <td>
                                            <div className="font-bold text-slate-800">{emp.employeeId}</div>
                                            {emp.associateCode && <div className="text-xs text-slate-400 font-medium">{emp.associateCode}</div>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {emp.photoUrl ? (
                                                    <img src={emp.photoUrl} alt={emp.name} className="employee-photo" />
                                                ) : (
                                                    <div className="photo-placeholder"><FiUser size={20} /></div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-slate-900">{emp.name}</div>
                                                    <div className="text-xs text-slate-500">{emp.designation || 'Staff Member'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${emp.workMode === 'OFFICE' ? 'badge-secondary' : 'badge-warning'}`}>
                                                {emp.workMode?.replace('_', ' ') || 'OFFICE'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="text-slate-600">
                                                <div className="flex items-center gap-1-5 mb-1 text-sm font-medium">
                                                    <FiMapPin size={12} className="text-primary" /> {getBranchName(emp.branchId)}
                                                </div>
                                                {emp.bankAccount && (
                                                    <div className="flex items-center gap-1-5 text-xs text-success font-bold">
                                                        <FiCreditCard size={12} /> {emp.bankAccount}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons justify-center" onClick={(e) => e.stopPropagation()}>
                                                <button className="action-btn edit" onClick={() => navigate(`/employee/edit/${emp.employeeId}`)}>
                                                    <FiEdit2 />
                                                </button>
                                                <button className="action-btn delete" onClick={() => handleDelete(emp.employeeId)}>
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="empty-message" style={{ textAlign: 'center', padding: '20px', color: '#777' }}>No mobile app employees found.</p>
                )}
            </div>

            {/* Kiosk Employees Section */}
            <div className="branch-header-premium mb-4">
                <div className="branch-label">
                    <span>🖥️ Kiosk / Common Employees</span>
                </div>
                <div className="branch-count">
                    {kioskEmployees.length} registered profiles
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                {kioskEmployees.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '120px' }}>ID & Code</th>
                                    <th>Employee Details</th>
                                    <th>Work Mode</th>
                                    <th>Location & Finance</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center', width: '100px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kioskEmployees.map((emp) => (
                                    <tr
                                        key={emp.employeeId}
                                        onClick={() => navigate(`/attendance/view/${emp.employeeId}`)}
                                        className="employee-card-row"
                                    >
                                        <td>
                                            <div className="font-bold text-slate-800">{emp.employeeId}</div>
                                            {emp.associateCode && <div className="text-xs text-slate-400 font-medium">{emp.associateCode}</div>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {emp.photoUrl ? (
                                                    <img src={emp.photoUrl} alt={emp.name} className="employee-photo" />
                                                ) : (
                                                    <div className="photo-placeholder"><FiUser size={20} /></div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-slate-900">{emp.name}</div>
                                                    <div className="text-xs text-slate-500">{emp.designation || 'Kiosk Access'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${emp.workMode === 'OFFICE' ? 'badge-secondary' : 'badge-warning'}`}>
                                                {emp.workMode?.replace('_', ' ') || 'OFFICE'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="text-slate-600">
                                                <div className="flex items-center gap-1-5 mb-1 text-sm font-medium">
                                                    <FiMapPin size={12} className="text-primary" /> {getBranchName(emp.branchId)}
                                                </div>
                                                {emp.bankAccount && (
                                                    <div className="flex items-center gap-1-5 text-xs text-success font-bold">
                                                        <FiCreditCard size={12} /> {emp.bankAccount}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons justify-center" onClick={(e) => e.stopPropagation()}>
                                                <button className="action-btn edit" onClick={() => navigate(`/employee/edit/${emp.employeeId}`)}>
                                                    <FiEdit2 />
                                                </button>
                                                <button className="action-btn delete" onClick={() => handleDelete(emp.employeeId)}>
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="empty-message" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>No kiosk employees found in this directory.</p>
                )}
            </div>
        </div>
    );
};

export default Employees;
