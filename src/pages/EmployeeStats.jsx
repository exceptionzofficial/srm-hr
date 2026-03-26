import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiMapPin, FiUsers, FiLayers, FiBriefcase } from 'react-icons/fi';
import { getEmployees, getBranches, getPayGroups, getDesignations } from '../services/api';

const EmployeeStats = () => {
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [payGroups, setPayGroups] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedPayGroup, setSelectedPayGroup] = useState('all');
    const [selectedDesignation, setSelectedDesignation] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [empRes, branchRes, pgRes, desigRes] = await Promise.all([
                getEmployees(),
                getBranches(),
                getPayGroups(),
                getDesignations()
            ]);
            setEmployees(empRes.employees || []);
            setBranches(branchRes.branches || []);
            setPayGroups(pgRes.payGroups || []);
            setDesignations(desigRes.designations || []);
        } catch (error) {
            console.error('Error loading stats data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const branchMatch = selectedBranch === 'all' || emp.branchId === selectedBranch;
        const pgMatch = selectedPayGroup === 'all' || emp.paygroup === selectedPayGroup;
        const desigMatch = selectedDesignation === 'all' || emp.designation === selectedDesignation;
        return branchMatch && pgMatch && desigMatch;
    });

    // Grouping functions
    const getStatsByPayGroup = () => {
        const stats = {};
        filteredEmployees.forEach(emp => {
            const pgId = emp.paygroup || 'Unassigned';
            const pgName = payGroups.find(p => p.payGroupId === pgId)?.name || pgId;
            stats[pgName] = (stats[pgName] || 0) + 1;
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]);
    };

    const getStatsByDesignation = () => {
        const stats = {};
        filteredEmployees.forEach(emp => {
            const desig = emp.designation || 'Not Specified';
            stats[desig] = (stats[desig] || 0) + 1;
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]);
    };

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    const pgStats = getStatsByPayGroup();
    const desigStats = getStatsByDesignation();

    return (
        <div className="stats-container animate-fade-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1 className="page-title">Employee Statistics</h1>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {/* Branch Filter */}
                <div className="search-wrapper" style={{ margin: 0, minWidth: '220px', background: 'white' }}>
                    <FiMapPin className="search-icon" />
                    <select 
                        className="search-input" 
                        value={selectedBranch} 
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    >
                        <option value="all">All Branches</option>
                        {branches.map(b => (
                            <option key={b.branchId} value={b.branchId}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {/* Pay Group Filter */}
                <div className="search-wrapper" style={{ margin: 0, minWidth: '220px', background: 'white' }}>
                    <FiLayers className="search-icon" />
                    <select 
                        className="search-input" 
                        value={selectedPayGroup} 
                        onChange={(e) => setSelectedPayGroup(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    >
                        <option value="all">All Pay Groups</option>
                        {payGroups.map(pg => (
                            <option key={pg.payGroupId} value={pg.payGroupId}>{pg.name}</option>
                        ))}
                    </select>
                </div>

                {/* Designation Filter */}
                <div className="search-wrapper" style={{ margin: 0, minWidth: '220px', background: 'white' }}>
                    <FiBriefcase className="search-icon" />
                    <select 
                        className="search-input" 
                        value={selectedDesignation} 
                        onChange={(e) => setSelectedDesignation(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    >
                        <option value="all">All Designations</option>
                        {designations.map(d => (
                            <option key={d.designationId} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                {/* Pay Group Stats */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <FiLayers style={{ color: 'var(--primary)' }} />
                        <h3 style={{ fontWeight: 600 }}>Pay Group Distribution</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {getStatsByPayGroup().length > 0 ? getStatsByPayGroup().map(([name, count]) => (
                            <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ fontWeight: 500 }}>{name}</span>
                                    <span style={{ fontWeight: 600 }}>{count} employees</span>
                                </div>
                                <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                                    <div 
                                        style={{ 
                                            background: 'var(--primary)', 
                                            height: '100%', 
                                            width: `${(count / filteredEmployees.length) * 100}%`,
                                            transition: 'width 0.5s ease-in-out'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )) : <p className="empty-message">No data available</p>}
                    </div>
                </div>

                {/* Designation Stats */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <FiBriefcase style={{ color: 'var(--secondary)' }} />
                        <h3 style={{ fontWeight: 600 }}>Designation Wise Strength</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {getStatsByDesignation().length > 0 ? getStatsByDesignation().map(([name, count]) => (
                            <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ fontWeight: 500 }}>{name}</span>
                                    <span style={{ fontWeight: 600 }}>{count} employees</span>
                                </div>
                                <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                                    <div 
                                        style={{ 
                                            background: 'var(--secondary)', 
                                            height: '100%', 
                                            width: `${(count / filteredEmployees.length) * 100}%`,
                                            transition: 'width 0.5s ease-in-out'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )) : <p className="empty-message">No data available</p>}
                    </div>
                </div>
            </div>

            {/* Employee List */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                    <FiUsers style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontWeight: 600 }}>Employee List ({filteredEmployees.length})</h3>
                </div>
                <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table className="stats-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase' }}>Employee</th>
                                <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase' }}>Branch</th>
                                <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase' }}>Designation</th>
                                <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase' }}>Pay Group</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                                <tr key={emp.employeeId}>
                                    <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{emp.name}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{emp.employeeId}</div>
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                                        {branches.find(b => b.branchId === emp.branchId)?.name || emp.branchId}
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                                        {emp.designation || '-'}
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                                        {payGroups.find(p => p.payGroupId === emp.paygroup)?.name || emp.paygroup || '-'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No employees found matching these criteria</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EmployeeStats;
