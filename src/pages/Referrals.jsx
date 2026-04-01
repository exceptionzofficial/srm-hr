import React, { useState, useEffect, useRef } from 'react';
import { FiZoomIn, FiZoomOut, FiMaximize, FiMinimize, FiUser, FiInfo, FiSearch } from 'react-icons/fi';
import { getEmployees } from '../services/api';
import './Referrals.css';

const Referrals = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [error, setError] = useState('');
    const treeContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await getEmployees();
            setEmployees(response.employees || []);
        } catch (err) {
            console.error('Error fetching employees for tree:', err);
            setError('Failed to load employee referrals');
        } finally {
            setLoading(false);
        }
    };

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.4));
    const handleResetZoom = () => setZoom(1);

    // Build hierarchical tree data structure
    const buildTreeData = () => {
        if (!employees.length) return [];

        const validIds = new Set(employees.map(e => e.employeeId));

        // Find roots: those with no referredBy, or their referredBy is not in the system 
        const rootNodes = employees.filter(emp => !emp.referredBy || !validIds.has(emp.referredBy));

        const getChildren = (parentId) => {
            const children = employees.filter(emp => emp.referredBy === parentId);
            return children.map(child => ({
                ...child,
                children: getChildren(child.employeeId)
            }));
        };

        return rootNodes.map(root => ({
            ...root,
            children: getChildren(root.employeeId)
        }));
    };

    // Recursive component to render tree nodes
    const TreeNode = ({ node }) => {
        const isRelieved = node.status === 'relieved';
        const isHighlighted = searchTerm && (node.name?.toLowerCase().includes(searchTerm.toLowerCase()) || node.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return (
            <li className="tree-li">
                <a href="#" className={`tree-node ${isRelieved ? 'relieved' : ''} ${isHighlighted ? 'highlighted' : ''}`} title={`Relation: ${node.referralRelation || 'Direct/Unknown'}`}>
                    <div className="node-avatar">
                        {node.photoUrl ? (
                            <img src={node.photoUrl} alt={node.name} />
                        ) : (
                            <FiUser size={20} />
                        )}
                    </div>
                    <span className="node-name">{node.name || 'Unknown'}</span>
                    <span className="node-role">{node.designation || node.role || 'Employee'}</span>
                    <span className="node-id">{node.employeeId}</span>
                    {node.referralRelation && (
                         <div style={{ fontSize: '10px', color: '#6366f1', marginTop: '4px', fontStyle: 'italic' }}>
                              Ref: {node.referralRelation}
                         </div>
                    )}
                </a>
                
                {/* Recursively render children if they exist */}
                {node.children && node.children.length > 0 && (
                    <ul className="tree-ul">
                        {node.children.map(child => (
                            <TreeNode key={child.employeeId} node={child} />
                        ))}
                    </ul>
                )}
            </li>
        );
    };

    // Drag to scroll logic
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - treeContainerRef.current.offsetLeft);
        setScrollLeft(treeContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - treeContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast factor
        treeContainerRef.current.scrollLeft = scrollLeft - walk;
    };


    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    const treeData = buildTreeData();

    return (
        <div className="referrals-page animate-fade-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1 className="page-title">Referral Network Tree</h1>
                <p style={{ color: '#64748b', marginTop: '8px' }}>Visualize standard parent-child referential hierarchy within the organization.</p>
            </div>

            {error && <div className="alert alert-danger" style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

            <div className={`referrals-workspace ${isFullscreen ? 'fullscreen-mode' : ''}`}>
                <div className="tree-controls" style={{ alignItems: 'center' }}>
                <span className="btn-control" style={{ border: 'none', background: 'transparent', cursor: 'default' }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <div style={{width: '12px', height: '12px', background: '#f8fafc', border: '2px solid #cbd5e1', borderRadius: '2px'}}></div>
                        <span style={{fontSize: '13px'}}>Relieved</span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px'}}>
                         <div style={{width: '12px', height: '12px', background: '#ffffff', border: '2px solid #22c55e', borderRadius: '2px'}}></div>
                         <span style={{fontSize: '13px'}}>Active</span>
                    </div>
                </span>
                
                <div style={{ flex: 1 }}></div>

                <div className="search-wrapper" style={{ maxWidth: '300px', flex: 1, display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', transition: 'all 0.2s' }}>
                    <FiSearch style={{ color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Search by name or ID..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', padding: '10px 8px', width: '100%', fontSize: '14px', color: '#333' }}
                    />
                </div>

                <button className="btn-control" onClick={handleZoomOut}><FiZoomOut /> Out</button>
                <button className="btn-control" onClick={handleResetZoom}><FiMaximize /> Reset</button>
                <button className="btn-control" onClick={handleZoomIn}><FiZoomIn /> In</button>
                <button className="btn-control" onClick={() => setIsFullscreen(!isFullscreen)}>
                    {isFullscreen ? <FiMinimize /> : <FiMaximize />} 
                    <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </button>
            </div>

            <div className="tree-container">
                <div 
                    className="tree-wrapper" 
                    ref={treeContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    <div style={{ 
                        transform: `scale(${zoom})`, 
                        transformOrigin: 'top center',
                        transition: 'transform 0.3s ease',
                        width: 'max-content',
                        margin: '0 auto',
                        paddingBottom: '100px'
                    }}>
                        {treeData.length > 0 ? (
                            <ul className="tree-ul" style={{ paddingTop: 0 }}>
                                {treeData.map((node) => (
                                    <TreeNode key={node.employeeId} node={node} />
                                ))}
                            </ul>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>
                                <FiInfo size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                                <p>No employees found in the referral network.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
    );
};

export default Referrals;
