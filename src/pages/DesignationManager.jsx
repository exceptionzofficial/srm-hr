import React, { useState, useEffect } from 'react';
import { FiBriefcase, FiPlus, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { getDesignations, createDesignation, deleteDesignation } from '../services/api';

const DesignationManager = () => {
    const [designations, setDesignations] = useState([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadDesignations();
    }, []);

    const loadDesignations = async () => {
        try {
            const res = await getDesignations();
            setDesignations(res.designations || []);
        } catch (err) {
            console.error('Error loading designations:', err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setLoading(true);
        setError('');
        try {
            await createDesignation({ name: newName.trim() });
            setSuccess('Designation added!');
            setNewName('');
            loadDesignations();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to add designation');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this designation?')) return;
        try {
            await deleteDesignation(id);
            loadDesignations();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    return (
        <div className="designation-manager animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* Form */}
                <div>
                    <div className="card">
                        <h3 className="page-title" style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiPlus style={{ color: 'var(--primary)' }} /> Add Designation
                        </h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label">Name</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g. Area Manager"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? 'Saving...' : 'Create Designation'}
                            </button>
                        </form>
                        {success && <div className="alert alert-success" style={{ marginTop: '16px', padding: '10px' }}>{success}</div>}
                        {error && <div className="alert alert-danger" style={{ marginTop: '16px', padding: '10px' }}>{error}</div>}
                    </div>
                </div>

                {/* List */}
                <div className="card" style={{ padding: '0' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontWeight: 600 }}>Designations List</h3>
                        <span className="badge badge-secondary">{designations.length} total</span>
                    </div>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Designation Name</th>
                                    <th style={{ textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {designations.length > 0 ? designations.map(d => (
                                    <tr key={d.designationId}>
                                        <td style={{ fontWeight: 500 }}>{d.name}</td>
                                        <td>
                                            <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                                <button onClick={() => handleDelete(d.designationId)} className="action-btn delete"><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="2" className="empty-message" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No designations registered yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesignationManager;
