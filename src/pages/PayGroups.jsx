import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BuildingOffice2Icon,
    PlusIcon,
    MagnifyingGlassIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getPayGroups } from '../services/api';

const API_BASE_URL = import.meta.env.DEV ? '' : 'https://srm-backend-lake.vercel.app';

const PayGroups = () => {
    const [payGroups, setPayGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isActive: true
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchPayGroups();
    }, []);

    const fetchPayGroups = async () => {
        try {
            const data = await getPayGroups();
            if (data.success) {
                setPayGroups(data.payGroups);
            }
        } catch (error) {
            console.error('Error fetching pay groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingId
                ? `${API_BASE_URL}/api/pay-groups/${editingId}`
                : `${API_BASE_URL}/api/pay-groups`;

            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            if (data.success) {
                fetchPayGroups();
                setShowModal(false);
                resetForm();
            } else {
                alert('Failed to save pay group: ' + data.message);
            }
        } catch (error) {
            console.error('Error saving pay group:', error);
            alert('Error saving pay group');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this pay group?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/pay-groups/${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
                fetchPayGroups();
            } else {
                alert('Failed to delete pay group: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting pay group:', error);
            alert('Error deleting pay group');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', isActive: true });
        setEditingId(null);
    };

    const openEditModal = (group) => {
        setFormData({
            name: group.name,
            description: group.description,
            isActive: group.isActive
        });
        setEditingId(group.payGroupId);
        setShowModal(true);
    };

    const filteredGroups = payGroups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="pay-groups-page" style={{ padding: '24px' }}>
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title">Pay Groups</h1>
                    <p className="text-secondary" style={{ marginTop: '4px', fontSize: '14px' }}>
                        Manage payroll groups and entities
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                >
                    <PlusIcon style={{ width: '20px', height: '20px' }} />
                    <span>Create Group</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="card" style={{ marginBottom: '32px', padding: '12px' }}>
                <div style={{ position: 'relative' }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9CA3AF' }} />
                    <input
                        type="text"
                        placeholder="Search pay groups..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
            </div>

            {/* Content - Table View */}
            {loading ? (
                <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '13px' }}>Group Name</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '13px' }}>Description</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '13px' }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '13px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode='popLayout'>
                                    {filteredGroups.map((group) => (
                                        <motion.tr
                                            key={group.payGroupId}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            style={{ borderTop: '1px solid #f3f4f6' }}
                                        >
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                                                        <BuildingOffice2Icon style={{ width: '20px', height: '20px', color: '#4B5563' }} />
                                                    </div>
                                                    <span style={{ fontWeight: 600 }}>{group.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>{group.description || <span className="text-secondary">-</span>}</td>
                                            <td style={{ padding: '16px' }}>
                                                <span className={`badge ${group.isActive ? 'badge-success' : 'badge-danger'}`} style={{ padding: '4px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>
                                                    {group.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={() => openEditModal(group)}
                                                        title="Edit"
                                                        style={{ padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#4b5563' }}
                                                    >
                                                        <FiEdit2 />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleDelete(group.payGroupId)}
                                                        title="Delete"
                                                        style={{ padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '450px',
                                backgroundColor: '#fff',
                                borderRadius: '24px',
                                padding: '32px',
                                margin: '16px',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                zIndex: 1001
                            }}
                        >
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ position: 'absolute', top: '24px', right: '24px', border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF' }}
                            >
                                <XMarkIcon style={{ width: '24px', height: '24px' }} />
                            </button>

                            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>
                                {editingId ? 'Edit Pay Group' : 'New Pay Group'}
                            </h2>

                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Group Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="form-input"
                                        placeholder="e.g. SRM Sweets"
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="form-input"
                                        style={{ minHeight: '100px', resize: 'none' }}
                                        placeholder="Brief description..."
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        style={{ width: '18px', height: '18px', borderRadius: '4px', accentColor: '#000' }}
                                    />
                                    <label htmlFor="isActive" style={{ fontSize: '14px', color: '#374151' }}>
                                        Active Status
                                    </label>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                    >
                                        {editingId ? 'Save Changes' : 'Create Group'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PayGroups;
