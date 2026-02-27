import React, { useState, useEffect } from 'react';
import { FiPlus, FiUser, FiEdit2, FiSearch, FiCreditCard, FiArrowLeft } from 'react-icons/fi';
import { getEmployees, createSalary, getSalaries, updateSalary, calculateSalary } from '../services/api';
import './Salary.css';

const Salary = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeSalaries, setEmployeeSalaries] = useState([]);
    const [showForm, setShowForm] = useState(false);

    const [editingSalary, setEditingSalary] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),

        // Header info
        designation: '', // Auto-filled from employee but editable for slip? No, mostly fixed.
        paymentType: 'CASH', // New Field
        workingDays: 26, // New Field

        // Earnings
        basic: 0,
        hra: 0,
        conveyance: 0,
        medical: 0,
        special: 0,
        bonus: 0,

        // Deductions
        pf: 0,
        esi: 0,
        pt: 0,
        tds: 0,
        advance: 0, // New Field
    });

    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const data = await getEmployees();

            // Filter by Branch
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const branchId = user.branchId;

            let allEmployees = data.employees || [];
            if (branchId) {
                allEmployees = allEmployees.filter(e => e.branchId === branchId);
            }

            setEmployees(allEmployees);
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEmployeeSelect = async (employee) => {
        setSelectedEmployee(employee);
        setShowForm(false);
        setEditingSalary(null);
        try {
            const salaries = await getSalaries(employee.employeeId);
            const sorted = (salaries || []).sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });
            setEmployeeSalaries(sorted);
        } catch (error) {
            console.error('Error fetching salaries:', error);
            setEmployeeSalaries([]);
        }
    };

    const handleBack = () => {
        setSelectedEmployee(null);
        setEmployeeSalaries([]);
        setShowForm(false);
        setSuccess('');
        setError('');
        setEditingSalary(null);
    };

    const calculateGross = () => {
        return (
            Number(formData.basic || 0) +
            Number(formData.hra || 0) +
            Number(formData.conveyance || 0) +
            Number(formData.medical || 0) +
            Number(formData.special || 0) +
            Number(formData.bonus || 0)
        );
    };

    const calculateDeductions = () => {
        return (
            Number(formData.pf || 0) +
            Number(formData.esi || 0) +
            Number(formData.pt || 0) +
            Number(formData.tds || 0) +
            Number(formData.advance || 0)
        );
    };

    const calculateNet = () => {
        return calculateGross() - calculateDeductions();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Handle numeric fields
        const numericFields = ['basic', 'hra', 'conveyance', 'medical', 'special', 'bonus', 'pf', 'esi', 'pt', 'tds', 'advance', 'workingDays', 'year'];

        let newValue = value;
        if (numericFields.includes(name)) {
            // Allow empty string to let user delete the "0"
            newValue = value === '' ? '' : Number(value);
        }

        const updatedData = { ...formData, [name]: newValue };
        setFormData(updatedData);

        // Auto-fetch deductions if month or year changes
        if (name === 'month' || name === 'year') {
            fetchAutoDeductions(updatedData.month, updatedData.year);
        }
    };

    const fetchAutoDeductions = async (month, year) => {
        if (!selectedEmployee) return;
        try {
            const data = await calculateSalary(selectedEmployee.employeeId, month, year);
            if (data.success) {
                setFormData(prev => ({
                    ...prev,
                    advance: data.deductions.advance,
                    pf: data.deductions.pf || prev.pf,
                    esi: data.deductions.esi || prev.esi
                }));
            }
        } catch (error) {
            console.error('Error fetching auto deductions:', error);
        }
    };

    const openEditModal = (salary) => {
        setEditingSalary(salary);
        setFormData({
            month: salary.month,
            year: salary.year,
            paymentType: salary.paymentType || 'CASH',
            workingDays: salary.workingDays || 26,

            basic: salary.components.basic,
            hra: salary.components.hra,
            conveyance: salary.components.conveyance,
            medical: salary.components.medical,
            special: salary.components.special,
            bonus: salary.components.bonus,

            pf: salary.deductions.pf,
            esi: salary.deductions.esi,
            pt: salary.deductions.pt,
            tds: salary.deductions.tds,
            advance: salary.deductions.advance || 0,
        });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const gross = calculateGross();
            const deductions = calculateDeductions();
            const net = calculateNet();

            const payload = {
                employeeId: selectedEmployee.employeeId,
                name: selectedEmployee.name,
                month: formData.month,
                year: formData.year,

                paymentType: formData.paymentType,
                workingDays: formData.workingDays,

                components: {
                    basic: Number(formData.basic),
                    hra: Number(formData.hra),
                    conveyance: Number(formData.conveyance),
                    medical: Number(formData.medical),
                    special: Number(formData.special),
                    bonus: Number(formData.bonus)
                },
                deductions: {
                    pf: Number(formData.pf),
                    esi: Number(formData.esi),
                    pt: Number(formData.pt),
                    tds: Number(formData.tds),
                    advance: Number(formData.advance)
                },
                grossSalary: gross,
                totalDeductions: deductions,
                netSalary: net,
                status: 'Processed'
            };

            if (editingSalary) {
                await updateSalary(editingSalary.salaryId, payload);
                setSuccess('Salary updated successfully!');
            } else {
                await createSalary(payload);
                setSuccess('Salary processed successfully!');
            }

            setShowForm(false);
            setEditingSalary(null);
            handleEmployeeSelect(selectedEmployee); // Refresh
        } catch (err) {
            setError('Failed to process salary');
            console.error(err);
        }
    };

    const openNewSalaryForm = () => {
        setEditingSalary(null);
        const initialForm = {
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            paymentType: 'CASH',
            workingDays: 26,
            basic: 0, hra: 0, conveyance: 0, medical: 0, special: 0, bonus: 0,
            pf: 0, esi: 0, pt: 0, tds: 0, advance: 0
        };
        setFormData(initialForm);
        setShowForm(true);

        // Fetch auto-calculated values for the default month/year
        fetchAutoDeductions(initialForm.month, initialForm.year);
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="loading-container">
            <div className="spinner"></div>
        </div>
    );

    // View: List Employees
    if (!selectedEmployee) {
        return (
            <div className="salary-page fade-in">
                <div className="section-header mb-8">
                    <div className="section-title">
                        <FiCreditCard />
                        <h2>Salary Management</h2>
                    </div>
                    <div className="search-container w-80">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Find employee to process..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="card bg-transparent border-none shadow-none p-0">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {filteredEmployees.map(emp => (
                            <div key={emp.employeeId}
                                className="card p-6 cursor-pointer flex flex-col gap-4 transition-all hover:-translate-y-1"
                                onClick={() => handleEmployeeSelect(emp)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                                        <FiUser size={24} />
                                    </div>
                                    <div>
                                        <h3 className="m-0 text-base font-bold text-slate-900">{emp.name}</h3>
                                        <p className="m-0 text-xs text-slate-500 font-medium">{emp.designation || 'Staff Member'}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee ID</span>
                                        <span className="text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 max-w-[140px] truncate" title={emp.employeeId}>
                                            {emp.employeeId}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</span>
                                        <span className="badge badge-secondary text-[11px] font-bold">{emp.branchId || 'N/A'}</span>
                                    </div>
                                </div>

                                <button className="btn btn-secondary w-full mt-2">
                                    Manage Salary
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // View: Employee Salary Details
    return (
        <div className="salary-details-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={handleBack} className="btn btn-secondary" style={{ padding: '8px 12px' }}>← Back</button>
                    <div>
                        <h2 className="page-title" style={{ fontSize: '24px', margin: 0 }}>{selectedEmployee.name}</h2>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Viewing Salary History</span>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={openNewSalaryForm}><FiPlus /> Process New Salary</button>
            </div>

            {success && <div className="alert alert-success">{success}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            {showForm ? (
                <div className="card">
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px' }}>
                        {editingSalary ? 'Edit Salary' : 'Process Salary'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                            {/* Section 1: details */}
                            <div className="form-section">
                                <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase' }}>Salary Details</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <label className="form-label">Month</label>
                                        <select className="form-input" name="month" value={formData.month} onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}>
                                            {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Year</label>
                                        <input className="form-input" type="number" name="year" value={formData.year} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className="form-label">Payment Type</label>
                                        <select className="form-input" name="paymentType" value={formData.paymentType} onChange={handleInputChange}>
                                            <option value="CASH">CASH</option>
                                            <option value="BANK">BANK TRANSFER</option>
                                            <option value="CHEQUE">CHEQUE</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Working Days</label>
                                        <input className="form-input" type="number" name="workingDays" value={formData.workingDays} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Earnings */}
                            <div className="form-section">
                                <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase' }}>Earnings</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div><label className="form-label">Basic</label> <input className="form-input" type="number" name="basic" value={formData.basic} onChange={handleInputChange} /></div>
                                    <div><label className="form-label">HRA</label> <input className="form-input" type="number" name="hra" value={formData.hra} onChange={handleInputChange} /></div>
                                    <div><label className="form-label">Conveyance</label> <input className="form-input" type="number" name="conveyance" value={formData.conveyance} onChange={handleInputChange} /></div>
                                    <div><label className="form-label">Medical</label> <input className="form-input" type="number" name="medical" value={formData.medical} onChange={handleInputChange} /></div>
                                    <div><label className="form-label">Special</label> <input className="form-input" type="number" name="special" value={formData.special} onChange={handleInputChange} /></div>
                                    <div><label className="form-label">Bonus</label> <input className="form-input" type="number" name="bonus" value={formData.bonus} onChange={handleInputChange} /></div>
                                </div>
                            </div>

                            {/* Section 3: Deductions */}
                            <div className="form-section">
                                <h4 style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase' }}>Deductions</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div><label className="form-label">PF</label> <input className="form-input" type="number" name="pf" value={formData.pf} onChange={handleInputChange} /></div>
                                    <div><label className="form-label">ESI</label> <input className="form-input" type="number" name="esi" value={formData.esi} onChange={handleInputChange} /></div>
                                    <div><label className="form-label">Professional Tax</label> <input className="form-input" type="number" name="pt" value={formData.pt} onChange={handleInputChange} /></div>
                                    <div><label className="form-label">TDS</label> <input className="form-input" type="number" name="tds" value={formData.tds} onChange={handleInputChange} /></div>
                                    <div><label className="form-label">Advance</label> <input className="form-input" type="number" name="advance" value={formData.advance} onChange={handleInputChange} /></div>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#2d3436', color: 'white', padding: '24px', borderRadius: '0', marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px' }}>
                            <div>
                                <span style={{ display: 'block', fontSize: '12px', opacity: 0.7 }}>GROSS EARNINGS</span>
                                <span style={{ fontSize: '20px', fontWeight: 600 }}>₹{calculateGross().toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', height: '40px' }}></div>
                            <div>
                                <span style={{ display: 'block', fontSize: '12px', opacity: 0.7, color: '#ff7675' }}>TOTAL DEDUCTIONS</span>
                                <span style={{ fontSize: '20px', fontWeight: 600, color: '#ff7675' }}>₹{calculateDeductions().toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', height: '40px' }}></div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'block', fontSize: '12px', opacity: 0.7, color: '#55efc4' }}>NET PAYABLE</span>
                                <span style={{ fontSize: '28px', fontWeight: 700, color: '#55efc4' }}>₹{calculateNet().toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary">{editingSalary ? 'Update Salary' : 'Save Salary'}</button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="card">
                    {employeeSalaries.length === 0 ? <p className="empty-message">No salary records found for this employee.</p> : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Period</th>
                                        <th>Date Processed</th>
                                        <th>Payment Type</th>
                                        <th>Gross</th>
                                        <th>Deductions</th>
                                        <th>Net Salary</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employeeSalaries.map((sal, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{new Date(0, sal.month - 1).toLocaleString('default', { month: 'long' })} {sal.year}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sal.workingDays || 0} Working Days</div>
                                            </td>
                                            <td>{new Date(sal.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <span className="badge badge-secondary">{sal.paymentType || 'CASH'}</span>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>₹{sal.grossSalary?.toLocaleString('en-IN')}</td>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--danger)' }}>₹{sal.totalDeductions?.toLocaleString('en-IN')}</td>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--success)', fontWeight: 'bold' }}>₹{sal.netSalary?.toLocaleString('en-IN')}</td>
                                            <td><span className="badge badge-success">{sal.status}</span></td>
                                            <td>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(sal)}>
                                                    <FiEdit2 /> Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Salary;
