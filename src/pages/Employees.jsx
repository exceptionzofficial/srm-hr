import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiSearch, FiEdit2, FiTrash2, FiPlus, FiMapPin, FiUser, FiCreditCard } from 'react-icons/fi';
import { getEmployees, deleteEmployee, getBranches } from '../services/api';

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
        <div className="employees-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h1 className="page-title" style={{ margin: 0 }}>Employees</h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="search-box" style={{ background: 'white', padding: '8px 12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', width: '300px' }}>
                        <FiSearch style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search by name, ID or code..."
                            style={{ border: 'none', outline: 'none', fontSize: '14px', width: '100%', background: 'transparent' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/employee/add')}>
                        <FiPlus /> Add Employee
                    </button>
                </div>
            </div>

            {success && <div className="badge badge-success" style={{ display: 'block', marginBottom: '10px', padding: '10px' }}>{success}</div>}
            {error && <div className="badge badge-danger" style={{ display: 'block', marginBottom: '10px', padding: '10px' }}>{error}</div>}


            {/* Mobile App Employees Section */}
            <h2 className="section-title" style={{ marginTop: '20px', marginBottom: '10px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📱 Mobile App Employees ({mobileEmployees.length})
            </h2>
            <div className="card">
                {mobileEmployees.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Name</th>
                                    <th>Work Mode</th>
                                    <th>Details</th>
                                    <th>Added By</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mobileEmployees.map((emp) => (
                                    <tr
                                        key={emp.employeeId}
                                        onClick={() => navigate(`/attendance/view/${emp.employeeId}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <strong>{emp.employeeId}</strong>
                                            {emp.associateCode && <div style={{ fontSize: '11px', color: '#666' }}>{emp.associateCode}</div>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {emp.photoUrl ? (
                                                    <img src={emp.photoUrl} alt={emp.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ background: '#F5F5F5', borderRadius: '50%', padding: '8px', color: 'var(--primary)' }}><FiUser /></div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: '500' }}>{emp.name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{emp.designation || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${emp.workMode === 'OFFICE' ? 'badge-secondary' : 'badge-warning'}`}>
                                                {emp.workMode?.replace('_', ' ') || 'OFFICE'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                                    <FiMapPin size={12} /> {getBranchName(emp.branchId)}
                                                </div>
                                                {emp.bankAccount && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--success)', fontSize: '11px' }}>
                                                        <FiCreditCard size={12} /> {emp.bankAccount}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-secondary" style={{ background: '#e2e8f0', color: '#475569' }}>
                                                {emp.addedBy || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); navigate(`/employee/edit/${emp.employeeId}`); }}>
                                                    <FiEdit2 />
                                                </button>
                                                <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(emp.employeeId); }}>
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
            <h2 className="section-title" style={{ marginTop: '30px', marginBottom: '10px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🖥️ Kiosk / Common Employees ({kioskEmployees.length})
            </h2>
            <div className="card">
                {kioskEmployees.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Name</th>
                                    <th>Work Mode</th>
                                    <th>Details</th>
                                    <th>Added By</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kioskEmployees.map((emp) => (
                                    <tr
                                        key={emp.employeeId}
                                        onClick={() => navigate(`/attendance/view/${emp.employeeId}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <strong>{emp.employeeId}</strong>
                                            {emp.associateCode && <div style={{ fontSize: '11px', color: '#666' }}>{emp.associateCode}</div>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {emp.photoUrl ? (
                                                    <img src={emp.photoUrl} alt={emp.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ background: '#F5F5F5', borderRadius: '50%', padding: '8px', color: 'var(--primary)' }}><FiUser /></div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: '500' }}>{emp.name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{emp.designation || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${emp.workMode === 'OFFICE' ? 'badge-secondary' : 'badge-warning'}`}>
                                                {emp.workMode?.replace('_', ' ') || 'OFFICE'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                                    <FiMapPin size={12} /> {getBranchName(emp.branchId)}
                                                </div>
                                                {emp.bankAccount && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--success)', fontSize: '11px' }}>
                                                        <FiCreditCard size={12} /> {emp.bankAccount}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-secondary" style={{ background: '#e2e8f0', color: '#475569' }}>
                                                {emp.addedBy || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); navigate(`/employee/edit/${emp.employeeId}`); }}>
                                                    <FiEdit2 />
                                                </button>
                                                <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(emp.employeeId); }}>
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
                    <p className="empty-message" style={{ textAlign: 'center', padding: '20px', color: '#777' }}>No kiosk employees found.</p>
                )}
            </div>
        </div>
    );
};

export default Employees;
