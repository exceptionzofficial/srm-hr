import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiRefreshCw, FiEdit2, FiTrash2, FiUser, FiMapPin, FiSearch, FiSmartphone, FiMonitor, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { getEmployees, deleteEmployee, getBranches, updateEmployee } from '../services/api';
import './Employees.css'; 

const RelievedEmployees = () => {
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
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = user.role || '';
            const userBranchId = user.branchId;
            const allowedAdminRoles = ['HR', 'HR_ADMIN', 'SUPER_ADMIN', 'ADMIN'];
            let queryBranchId = null;
            if (!allowedAdminRoles.includes(userRole) && userBranchId) {
                queryBranchId = userBranchId;
            }

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

    const handleReadd = async (employeeId) => {
        if (!confirm('Are you sure you want to re-add this employee? they will be moved back to the active list.')) return;
        try {
            await updateEmployee(employeeId, { status: 'active' });
            setSuccess('Employee re-added successfully');
            loadData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.message || 'Error re-adding employee');
        }
    };

    const getBranchName = (branchId) => {
        const branch = branches.find(b => b.branchId === branchId);
        return branch?.name || '-';
    };

    const relievedEmployees = employees
        .filter(emp => {
            if (emp.status !== 'relieved') return false;
            const searchLower = searchTerm.toLowerCase();
            return (
                emp.name?.toLowerCase().includes(searchLower) ||
                emp.employeeId?.toLowerCase().includes(searchLower) ||
                emp.associateCode?.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    const mobileEmployees = relievedEmployees.filter(emp => 
        !emp.employeeId?.startsWith('SRMC') && emp.employeeType !== 'kiosk'
    );
    const kioskEmployees = relievedEmployees.filter(emp => 
        emp.employeeId?.startsWith('SRMC') || emp.employeeType === 'kiosk'
    );

    const renderRelievedTable = (list, title, icon) => (
        <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    {icon} {title}
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                        {list.length} Records
                    </span>
                </h2>
            </div>
            <div className="overflow-x-auto bg-white rounded-xl border border-gray-100 shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-sm font-bold text-slate-900 border-b border-slate-200">Employee ID</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-900 border-b border-slate-200">Name</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-900 border-b border-slate-200">Branch</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-900 border-b border-slate-200">Status</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-900 border-b border-slate-200 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {list.length > 0 ? list.map((emp) => (
                            <tr key={emp.employeeId} className="hover:bg-gray-50/50 transition-colors opacity-80">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{emp.employeeId}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {emp.photoUrl ? <img src={emp.photoUrl} alt="" className="w-full h-full object-cover" /> : <FiUser className="text-gray-400" />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                                            <div className="text-xs text-gray-500">{emp.email || emp.phone}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <FiMapPin className="text-primary w-3.5 h-3.5" />
                                        {getBranchName(emp.branchId)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">
                                        Relieved
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            title="Re-add Employee" 
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                                            onClick={() => handleReadd(emp.employeeId)}
                                        >
                                            <FiRefreshCw className="w-4 h-4" />
                                        </button>
                                        <button 
                                            title="View Full Profile" 
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                            onClick={() => navigate(`/employee-master/edit/${emp.employeeId}`)}
                                        >
                                            <FiEdit2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-sm">No relieved employees found in this category.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/employee-master/list')}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white"
                    >
                        <FiArrowLeft className="w-5 h-5 text-slate-900" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Relieved Employees</h1>
                        <p className="text-sm text-slate-600 mt-1 font-medium">Manage employees who have resigned or been relieved.</p>
                    </div>
                </div>
                
                <div className="relative w-full md:w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search relieved staff..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {success && (
                <div className="mb-6 flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-100 animate-slide-up text-sm font-medium">
                    <FiCheck /> {success}
                </div>
            )}
            {error && (
                <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 animate-slide-up text-sm font-medium">
                    {error}
                </div>
            )}

            {renderRelievedTable(mobileEmployees, "Relieved Mobile Employees", <FiSmartphone className="text-blue-600" />)}
            {renderRelievedTable(kioskEmployees, "Relieved Kiosk Employees", <FiMonitor className="text-purple-600" />)}
        </div>
    );
};

export default RelievedEmployees;
