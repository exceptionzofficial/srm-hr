import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiBriefcase, FiMail, FiMapPin, FiTrash2, FiEdit2, FiUser } from 'react-icons/fi';
import { getEmployees, getBranches, deleteEmployee } from '../services/api';
import './Employees.css'; // Reusing Employees CSS for consistency

const Managers = () => {
    const navigate = useNavigate();
    const [managers, setManagers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [empRes, branchRes] = await Promise.all([
                getEmployees(),
                getBranches().catch(() => ({ branches: [] }))
            ]);

            const managersList = (empRes.employees || []).filter(e =>
                e.employeeId?.startsWith('MGR') ||
                ['BRANCH_MANAGER', 'CLUSTER_MANAGER', 'RETAIL_MANAGER', 'HR_ADMIN', 'FINANCE_ADMIN', 'LEGAL_ADMIN', 'PRODUCTION_ADMIN', 'QUALITY_ADMIN', 'MANAGER'].includes(e.role)
            );
            setManagers(managersList);
            setBranches(branchRes.branches || []);
        } catch (error) {
            console.error(error);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredManagers = managers.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone?.includes(searchTerm)
    );

    const handleNavigate = (id = null) => {
        if (id) {
            navigate(`/employee-master/managers/edit/${id}`);
        } else {
            navigate('/employee-master/managers/add');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to remove this manager?')) return;
        try {
            await deleteEmployee(id);
            setSuccess('Manager removed successfully');
            loadData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to delete manager');
        }
    };

    const getBranchName = (id) => {
        const b = branches.find(b => b.branchId === id);
        return b ? b.name : 'Unassigned';
    };

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div className="employees-page animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Managers</h1>
                <div className="header-actions">
                    <div className="search-wrapper">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search managers..."
                            className="search-input"
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => handleNavigate()}>
                        <FiPlus /> Add Manager
                    </button>
                </div>
            </div>

            {success && <div className="alert alert-success">{success}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Role & Branch</th>
                                <th>Contact Details</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredManagers.map(manager => (
                                <tr key={manager.employeeId}>
                                    <td><strong>{manager.employeeId}</strong></td>
                                    <td>
                                        <div className="employee-info">
                                            <div className="employee-avatar">
                                                {manager.photoUrl ? <img src={manager.photoUrl} alt="" /> : <FiUser />}
                                            </div>
                                            <div>
                                                <span className="employee-name">{manager.name}</span>
                                                <span className="employee-email">
                                                    Joined: {manager.joinedDate ? manager.joinedDate.split('T')[0] : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span className="badge badge-secondary" style={{ width: 'fit-content' }}>
                                                {manager.role ? manager.role.replace('_', ' ') : 'Manager'}
                                            </span>
                                            <div className="branch-cell">
                                                <FiMapPin className="branch-icon-small" />
                                                <span>{getBranchName(manager.branchId)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px' }}>
                                            <span>{manager.email || 'No email'}</span>
                                            {manager.phone && <span style={{ color: 'var(--text-secondary)' }}>{manager.phone}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${manager.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                            {manager.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="action-btn edit" onClick={() => handleNavigate(manager.employeeId)} title="Edit">
                                                <FiEdit2 />
                                            </button>
                                            <button className="action-btn delete" onClick={() => handleDelete(manager.employeeId)} title="Delete">
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredManagers.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="empty-message">
                                        No managers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Managers;
