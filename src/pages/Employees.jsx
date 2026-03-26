import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiSearch, FiEdit2, FiTrash2, FiPlus, FiMapPin, FiUser, FiSmartphone, FiMonitor, FiShield, FiLogOut } from 'react-icons/fi';
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
            const allowedAdminRoles = ['HR', 'HR_ADMIN', 'SUPER_ADMIN', 'ADMIN'];

            let queryBranchId = null;

            // If NOT an admin role, enforce branch isolation
            if (!allowedAdminRoles.includes(userRole)) {
                if (userBranchId) {
                    queryBranchId = userBranchId;
                }
            }

            // Fetch Employees (passing branchId if isolated)
            const [empResponse, branchResponse] = await Promise.all([
                getEmployees(queryBranchId),
                getBranches().catch(() => ({ branches: [] })),
            ]);
            setEmployees(empResponse.employees || []);
            setBranches(branchResponse.branches || []);
        } catch (error) {
            console.error('Error loading data:', error);
            setError('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const handleRelieve = async (employeeId) => {
        if (!confirm('Are you sure you want to mark this employee as relieved? They will be moved to the Relieved Employees list.')) return;
        try {
            const { updateEmployee } = await import('../services/api');
            await updateEmployee(employeeId, { status: 'relieved' });
            setSuccess('Employee marked as relieved successfully');
            loadData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.message || 'Error relieving employee');
        }
    };

    const handleDelete = async (employeeId) => {
        if (!confirm('Are you sure you want to delete this employee? This action is permanent.')) return;
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
            if (emp.status === 'relieved') return false; // Hide relieved employees
            const searchLower = searchTerm.toLowerCase();
            return (
                emp.name?.toLowerCase().includes(searchLower) ||
                emp.employeeId?.toLowerCase().includes(searchLower) ||
                emp.associateCode?.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Unified Manager Definition
    const isManager = (emp) => 
        emp.employeeId?.startsWith('MGR') || 
        ['BRANCH_MANAGER', 'CLUSTER_MANAGER', 'RETAIL_MANAGER', 'HR_ADMIN', 'FINANCE_ADMIN', 'LEGAL_ADMIN', 'PRODUCTION_ADMIN', 'QUALITY_ADMIN', 'MANAGER'].includes(emp.role);

    const kioskEmployees = filteredEmployees.filter(emp => 
        !isManager(emp) && 
        (emp.employeeId?.startsWith('SRMC') || emp.employeeType === 'kiosk')
    );
    const mobileEmployees = filteredEmployees.filter(emp => 
        !isManager(emp) && 
        !emp.employeeId?.startsWith('SRMC') && 
        emp.employeeType !== 'kiosk'
    );

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    const renderEmployeeTable = (employeeList, title, icon, countLabel) => {
        return (
            <>
                <div className="section-header" style={{ marginTop: '32px' }}>
                    <h2 className="section-title">
                        {icon} {title}
                    </h2>
                    <span className="branch-count-badge" style={{ 
                        background: '#f1f5f9', 
                        padding: '2px 10px', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: 'var(--text-secondary)' 
                    }}>
                        {employeeList.length} {countLabel}
                    </span>
                </div>
                <div className="card">
                    {employeeList.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Employee ID</th>
                                        <th>Name</th>
                                        <th>Branch</th>
                                        <th>Work Mode</th>
                                        <th>Face Status</th>
                                        <th>Added By</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employeeList.map((emp) => (
                                        <tr key={emp.employeeId} onClick={() => navigate(`/attendance/view/${emp.employeeId}`)} style={{ cursor: 'pointer' }}>
                                            <td><strong>{emp.employeeId}</strong></td>
                                            <td>
                                                <div className="employee-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className={`employee-avatar ${emp.photoUrl ? 'has-photo' : ''}`} style={{ 
                                                        width: '36px', 
                                                        height: '36px', 
                                                        background: '#F5F5F5', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        borderRadius: '0',
                                                        overflow: emp.photoUrl ? 'hidden' : 'visible'
                                                    }}>
                                                        {emp.photoUrl ? <img src={emp.photoUrl} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiUser />}
                                                    </div>
                                                    <div>
                                                        <span className="employee-name" style={{ display: 'block', fontWeight: 500 }}>{emp.name}</span>
                                                        <span className="employee-email" style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>{emp.email || emp.phone}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="branch-cell" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FiMapPin className="branch-icon-small" style={{ color: 'var(--primary)', fontSize: '14px' }} />
                                                    <span>{getBranchName(emp.branchId)}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${emp.workMode === 'OFFICE' ? 'badge-secondary' : 'badge-warning'}`}>
                                                    {emp.workMode?.replace('_', ' ') || 'OFFICE'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${emp.faceId ? 'badge-success' : 'badge-warning'}`}>
                                                    {emp.faceId ? 'Registered' : 'Not Registered'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge badge-secondary">
                                                    {emp.addedBy || 'N/A'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                                                    <button title="Edit" className="action-btn edit" onClick={(e) => { e.stopPropagation(); navigate(`/employee-master/edit/${emp.employeeId}`); }}>
                                                        <FiEdit2 />
                                                    </button>
                                                    <button title="Relieve" className="action-btn relieve" style={{ color: '#f59e0b' }} onClick={(e) => { e.stopPropagation(); handleRelieve(emp.employeeId); }}>
                                                        <FiLogOut />
                                                    </button>
                                                    <button title="Delete" className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(emp.employeeId); }}>
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
                        <p className="empty-message" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No {title.toLowerCase()} found.</p>
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="employees-page animate-fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 className="page-title">Employees</h1>
                <div className="header-actions">
                    <div className="search-wrapper">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name, ID or code..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {success && <div className="alert alert-success" style={{ padding: '12px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '8px', marginBottom: '16px' }}>{success}</div>}
            {error && <div className="alert alert-danger" style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}


            {renderEmployeeTable(mobileEmployees, "Mobile App Employees", <FiSmartphone className="text-primary" />, "active members")}
            {renderEmployeeTable(kioskEmployees, "Kiosk / Common Employees", <FiMonitor className="text-primary" />, "registered profiles")}
        </div>
    );
};

export default Employees;
