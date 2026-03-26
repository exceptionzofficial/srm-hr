/**
 * Documents Page - View and Upload Employee Documents (HR Portal)
 */

import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiUser, FiFileText, FiExternalLink, FiChevronDown, FiChevronUp, FiCamera, FiCreditCard, FiFile, FiBookOpen, FiHome, FiUpload, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import { getEmployees, getBranches, updateEmployee } from '../services/api';
import './Documents.css';

const DOCUMENT_LABELS = {
    aadharUrl: { label: 'Aadhar Card', Icon: FiCreditCard, field: 'doc_aadhar' },
    panUrl: { label: 'PAN Card', Icon: FiCreditCard, field: 'doc_pan' },
    licenseUrl: { label: 'Driving License', Icon: FiFile, field: 'doc_license' },
    bankPassbookUrl: { label: 'Bank Passbook', Icon: FiCreditCard, field: 'doc_bankpassbook' },
    degreeCertificateUrl: { label: 'Degree / Payslip', Icon: FiBookOpen, field: 'doc_degreecertificate' },
};

const Documents = () => {
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [uploading, setUploading] = useState({}); // { employeeId_docKey: true }
    const [uploadSuccess, setUploadSuccess] = useState({}); // { employeeId_docKey: true }
    const fileInputRefs = useRef({});

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const branchId = !['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role) ? user.branchId : null;
            const [empData, branchData] = await Promise.all([
                getEmployees(branchId),
                getBranches()
            ]);
            setEmployees(empData.employees || []);
            setBranches(branchData.branches || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getBranchName = (branchId) => {
        if (!branchId) return 'Unassigned';
        const branch = branches.find(b => b.branchId === branchId);
        return branch ? branch.name : branchId;
    };

    const getDocumentCount = (emp) => {
        const docs = emp.documents || {};
        return Object.keys(DOCUMENT_LABELS).filter(key => docs[key]).length;
    };

    const handleUpload = async (employeeId, docKey, fieldName, file) => {
        const uploadKey = `${employeeId}_${docKey}`;
        setUploading(prev => ({ ...prev, [uploadKey]: true }));
        setUploadSuccess(prev => ({ ...prev, [uploadKey]: false }));

        try {
            const formData = new FormData();
            formData.append(fieldName, file);

            await updateEmployee(employeeId, formData);

            // Refresh data
            const branchId = !['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role) ? user.branchId : null;
            const empData = await getEmployees(branchId);
            setEmployees(empData.employees || []);

            setUploadSuccess(prev => ({ ...prev, [uploadKey]: true }));
            setTimeout(() => {
                setUploadSuccess(prev => ({ ...prev, [uploadKey]: false }));
            }, 3000);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        } finally {
            setUploading(prev => ({ ...prev, [uploadKey]: false }));
        }
    };

    const triggerFileInput = (employeeId, docKey) => {
        const refKey = `${employeeId}_${docKey}`;
        if (fileInputRefs.current[refKey]) {
            fileInputRefs.current[refKey].click();
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by branch
    const employeesByBranch = filteredEmployees.reduce((acc, emp) => {
        const branchId = emp.branchId || 'Unassigned';
        const branchName = getBranchName(branchId);
        if (!acc[branchName]) acc[branchName] = [];
        acc[branchName].push(emp);
        return acc;
    }, {});

    const toggleExpand = (employeeId) => {
        setExpandedEmployee(expandedEmployee === employeeId ? null : employeeId);
    };

    if (loading) return (
        <div className="loading-container">
            <div className="spinner"></div>
        </div>
    );

    const totalDocs = Object.keys(DOCUMENT_LABELS).length;

    return (
        <div className="documents-page">
            {/* Page Header */}
            <div className="documents-header">
                <div>
                    <h1 className="page-title">Employee Documents</h1>
                    <p className="page-subtitle">
                        Upload, view, and manage documents for employees
                    </p>
                </div>
                <div className="documents-search">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by Name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="documents-stats">
                <div className="doc-stat-card">
                    <span className="doc-stat-label">Total Employees</span>
                    <span className="doc-stat-value primary">{employees.length}</span>
                </div>
                <div className="doc-stat-card">
                    <span className="doc-stat-label">With Documents</span>
                    <span className="doc-stat-value success">
                        {employees.filter(e => getDocumentCount(e) > 0).length}
                    </span>
                </div>
                <div className="doc-stat-card">
                    <span className="doc-stat-label">All Documents</span>
                    <span className="doc-stat-value complete">
                        {employees.filter(e => getDocumentCount(e) === totalDocs).length}
                    </span>
                </div>
                <div className="doc-stat-card">
                    <span className="doc-stat-label">Missing Documents</span>
                    <span className="doc-stat-value danger">
                        {employees.filter(e => getDocumentCount(e) === 0).length}
                    </span>
                </div>
            </div>

            {/* Employees by Branch */}
            {Object.keys(employeesByBranch).length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>No employees found.</p>
                </div>
            ) : (
                Object.entries(employeesByBranch).map(([branchName, branchEmployees]) => (
                    <div key={branchName} className="branch-section">
                        {/* Branch Header */}
                        <div className="branch-header-bar">
                            <span className="branch-header-name">
                                <FiHome size={16} /> {branchName}
                            </span>
                            <span className="branch-emp-count">
                                {branchEmployees.length} {branchEmployees.length === 1 ? 'employee' : 'employees'}
                            </span>
                        </div>

                        {/* Employee Table */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>#</th>
                                            <th>Employee Name</th>
                                            <th>Employee ID</th>
                                            <th>Designation</th>
                                            <th style={{ textAlign: 'center' }}>Documents</th>
                                            <th style={{ textAlign: 'center', width: '100px' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {branchEmployees.map((emp, idx) => {
                                            const docCount = getDocumentCount(emp);
                                            const isExpanded = expandedEmployee === emp.employeeId;

                                            return (
                                                <React.Fragment key={emp.employeeId}>
                                                    <tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(emp.employeeId)}>
                                                        <td className="text-muted">{idx + 1}</td>
                                                        <td>
                                                            <div className="emp-name-cell">
                                                                {emp.documents?.photoUrl ? (
                                                                    <img
                                                                        src={emp.documents.photoUrl}
                                                                        alt={emp.name}
                                                                        className="emp-avatar"
                                                                    />
                                                                ) : (
                                                                    <div className="emp-avatar-placeholder">
                                                                        <FiUser size={16} />
                                                                    </div>
                                                                )}
                                                                <span className="emp-name">{emp.name}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="emp-id-badge">{emp.employeeId}</span>
                                                        </td>
                                                        <td className="text-muted">{emp.designation || 'Staff'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className={`doc-count-badge ${docCount === totalDocs ? 'complete' : docCount > 0 ? 'partial' : 'none'}`}>
                                                                {docCount}/{totalDocs} uploaded
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={(e) => { e.stopPropagation(); toggleExpand(emp.employeeId); }}
                                                            >
                                                                {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                                                                {isExpanded ? ' Hide' : ' View'}
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Document Details with Upload */}
                                                    {isExpanded && (
                                                        <tr key={`${emp.employeeId}-docs`}>
                                                            <td colSpan={6} style={{ padding: 0 }}>
                                                                <div className="doc-grid-container">
                                                                    {Object.entries(DOCUMENT_LABELS).map(([key, { label, Icon, field }]) => {
                                                                        const url = emp.documents?.[key];
                                                                        const uploadKey = `${emp.employeeId}_${key}`;
                                                                        const isUploading = uploading[uploadKey];
                                                                        const isSuccess = uploadSuccess[uploadKey];

                                                                        return (
                                                                            <div
                                                                                key={key}
                                                                                className={`doc-card ${url ? 'uploaded' : 'missing'}`}
                                                                            >
                                                                                <div className="doc-card-icon">
                                                                                    <Icon size={22} />
                                                                                </div>
                                                                                <div className="doc-card-info">
                                                                                    <div className="doc-card-label">{label}</div>
                                                                                    <div className={`doc-card-status ${url ? 'status-uploaded' : 'status-missing'}`}>
                                                                                        {url ? '✓ Uploaded' : '✗ Not uploaded'}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="doc-card-actions">
                                                                                    {url && (
                                                                                        <a
                                                                                            href={url}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="doc-view-btn"
                                                                                            title="View document"
                                                                                        >
                                                                                            <FiExternalLink size={16} />
                                                                                        </a>
                                                                                    )}
                                                                                    {/* Upload / Re-upload Button */}
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*,.pdf"
                                                                                        style={{ display: 'none' }}
                                                                                        ref={el => fileInputRefs.current[uploadKey] = el}
                                                                                        onChange={(e) => {
                                                                                            if (e.target.files[0]) {
                                                                                                handleUpload(emp.employeeId, key, field, e.target.files[0]);
                                                                                            }
                                                                                            e.target.value = '';
                                                                                        }}
                                                                                    />
                                                                                    <button
                                                                                        className={`doc-upload-btn ${isUploading ? 'uploading' : ''} ${isSuccess ? 'success' : ''}`}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (!isUploading) triggerFileInput(emp.employeeId, key);
                                                                                        }}
                                                                                        disabled={isUploading}
                                                                                        title={url ? 'Re-upload' : 'Upload'}
                                                                                    >
                                                                                        {isUploading ? (
                                                                                            <FiLoader size={14} className="spin" />
                                                                                        ) : isSuccess ? (
                                                                                            <FiCheck size={14} />
                                                                                        ) : (
                                                                                            <FiUpload size={14} />
                                                                                        )}
                                                                                        <span>{isUploading ? 'Uploading...' : isSuccess ? 'Done!' : (url ? 'Re-upload' : 'Upload')}</span>
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default Documents;
