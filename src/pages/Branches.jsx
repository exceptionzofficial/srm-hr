/**
 * Branches Management Page
 * Add/Edit/Delete branches with Google Maps visualization
 */

import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiUsers, FiSearch } from 'react-icons/fi';
import { getBranches, createBranch, updateBranch, deleteBranch, getAllEmployeeLocations } from '../services/api';
import './Branches.css';

const Branches = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        radiusMeters: 100,
        branchType: 'main',
        isActive: true,
    });

    // Branch type colors
    const branchTypeColors = {
        main: '#EF4136',      // Primary red
        sales: '#4CAF50',     // Green
        franchise: '#FF7F27', // Secondary orange
        jv: '#9C27B0',        // Purple
        retail: '#2196F3',    // Blue
        production: '#795548' // Brown
    };
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [mapReady, setMapReady] = useState(false);
    const [employeeLocations, setEmployeeLocations] = useState([]);
    const [showEmployees, setShowEmployees] = useState(true);

    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const circlesRef = useRef([]);
    const employeeMarkersRef = useRef([]);
    const tempMarkerRef = useRef(null);
    const tempCircleRef = useRef(null);

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadBranches();
        initMap();
    }, []);

    useEffect(() => {
        if (mapReady && branches.length > 0) {
            updateMapMarkers();
        }
    }, [branches, mapReady]);

    // Filter and Sort Branches
    const filteredBranches = branches
        .filter(branch => {
            const searchLower = searchTerm.toLowerCase();
            return (
                branch.name?.toLowerCase().includes(searchLower) ||
                branch.address?.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    // Auto-refresh employee locations every 30 seconds
    useEffect(() => {
        if (mapReady) {
            loadEmployeeLocations();
            const interval = setInterval(loadEmployeeLocations, 30000);
            return () => clearInterval(interval);
        }
    }, [mapReady]);

    // Update employee markers when locations change
    useEffect(() => {
        if (mapReady && showEmployees) {
            updateEmployeeMarkers();
        }
    }, [employeeLocations, mapReady, showEmployees]);

    const initMap = () => {
        const checkGoogleMaps = () => {
            // Wait for both Google Maps API and DOM element
            if (window.google && window.google.maps && mapRef.current) {
                const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India center

                mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                    center: defaultCenter,
                    zoom: 5,
                    styles: [
                        {
                            featureType: 'poi',
                            stylers: [{ visibility: 'off' }],
                        },
                    ],
                });

                // Click handler to add new location
                mapInstanceRef.current.addListener('click', (e) => {
                    if (showModal) {
                        const lat = e.latLng.lat().toFixed(6);
                        const lng = e.latLng.lng().toFixed(6);
                        setFormData(prev => ({
                            ...prev,
                            latitude: lat,
                            longitude: lng,
                        }));
                        updateTempMarker(parseFloat(lat), parseFloat(lng), formData.radiusMeters);
                    }
                });

                setMapReady(true);
            } else {
                // Retry until both are ready
                setTimeout(checkGoogleMaps, 200);
            }
        };
        // Small delay to ensure DOM is rendered
        setTimeout(checkGoogleMaps, 100);
    };

    const loadBranches = async () => {
        try {
            const data = await getBranches();
            setBranches(data.branches || []);
        } catch (error) {
            console.error('Error loading branches:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadEmployeeLocations = async () => {
        try {
            const data = await getAllEmployeeLocations();
            setEmployeeLocations(data.employees || []);
        } catch (error) {
            console.error('Error loading employee locations:', error);
        }
    };

    const updateEmployeeMarkers = () => {
        // Clear existing employee markers
        employeeMarkersRef.current.forEach(marker => marker.setMap(null));
        employeeMarkersRef.current = [];

        if (!mapInstanceRef.current || !showEmployees) return;

        employeeLocations.forEach(emp => {
            if (!emp.lastLocation) return;

            const position = {
                lat: emp.lastLocation.latitude,
                lng: emp.lastLocation.longitude
            };

            // Determine marker color based on status
            let markerColor = '#999'; // Gray for offline
            if (emp.isOnline) {
                markerColor = emp.isInsideGeofence ? '#4CAF50' : '#EF4136'; // Green if inside, Red if outside
            }

            // Create employee marker (smaller, different shape)
            const marker = new window.google.maps.Marker({
                position,
                map: mapInstanceRef.current,
                title: `${emp.name} (${emp.isInsideGeofence ? 'Inside' : 'Outside'})`,
                icon: {
                    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 5,
                    fillColor: markerColor,
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 1.5,
                    rotation: 0,
                },
                zIndex: 1000, // Above branch markers
            });

            // Create info window for employee
            const infoWindow = new window.google.maps.InfoWindow({
                content: `
                    <div style="padding: 8px; font-family: Poppins, sans-serif;">
                        <strong>${emp.name}</strong><br/>
                        <small style="color: ${markerColor}; font-weight: 600;">
                            ${emp.isOnline ? (emp.isInsideGeofence ? '✓ Inside Geofence' : '⚠ Outside Geofence') : '○ Offline'}
                        </small><br/>
                        <small>Branch: ${emp.branchName || 'Unassigned'}</small><br/>
                        ${emp.lastLocation ? `<small>Last seen: ${new Date(emp.lastLocation.timestamp).toLocaleTimeString()}</small>` : ''}
                    </div>
                `,
            });

            marker.addListener('click', () => {
                infoWindow.open(mapInstanceRef.current, marker);
            });

            employeeMarkersRef.current.push(marker);
        });
    };

    const updateMapMarkers = () => {
        // Clear existing markers and circles
        markersRef.current.forEach(marker => marker.setMap(null));
        circlesRef.current.forEach(circle => circle.setMap(null));
        markersRef.current = [];
        circlesRef.current = [];

        if (!mapInstanceRef.current) return;

        const bounds = new window.google.maps.LatLngBounds();

        branches.forEach(branch => {
            const position = { lat: branch.latitude, lng: branch.longitude };
            const branchColor = branch.isActive
                ? (branchTypeColors[branch.branchType] || branchTypeColors.main)
                : '#999';

            // Create marker
            const marker = new window.google.maps.Marker({
                position,
                map: mapInstanceRef.current,
                title: branch.name,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: branchColor,
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                },
            });

            // Create info window
            const infoWindow = new window.google.maps.InfoWindow({
                content: `
                    <div style="padding: 8px; font-family: Poppins, sans-serif;">
                        <strong>${branch.name}</strong><br/>
                        <small style="color: ${branchColor}; font-weight: 600; text-transform: capitalize;">${branch.branchType || 'main'}</small><br/>
                        <small>${branch.address || 'No address'}</small><br/>
                        <small>Radius: ${branch.radiusMeters}m</small>
                    </div>
                `,
            });

            marker.addListener('click', () => {
                infoWindow.open(mapInstanceRef.current, marker);
            });

            // Create radius circle
            const circle = new window.google.maps.Circle({
                map: mapInstanceRef.current,
                center: position,
                radius: branch.radiusMeters,
                fillColor: branchColor,
                fillOpacity: 0.2,
                strokeColor: branchColor,
                strokeOpacity: 0.8,
                strokeWeight: 2,
            });

            markersRef.current.push(marker);
            circlesRef.current.push(circle);
            bounds.extend(position);
        });

        if (branches.length > 0) {
            mapInstanceRef.current.fitBounds(bounds);
            if (branches.length === 1) {
                mapInstanceRef.current.setZoom(15);
            }
        }
    };

    const updateTempMarker = (lat, lng, radius) => {
        if (!mapInstanceRef.current) return;

        // Remove existing temp marker and circle
        if (tempMarkerRef.current) tempMarkerRef.current.setMap(null);
        if (tempCircleRef.current) tempCircleRef.current.setMap(null);

        const position = { lat, lng };

        // Create temp marker
        tempMarkerRef.current = new window.google.maps.Marker({
            position,
            map: mapInstanceRef.current,
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: '#FF6B35',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 3,
            },
            draggable: true,
        });

        // Update on drag
        tempMarkerRef.current.addListener('dragend', (e) => {
            const newLat = e.latLng.lat().toFixed(6);
            const newLng = e.latLng.lng().toFixed(6);
            setFormData(prev => ({
                ...prev,
                latitude: newLat,
                longitude: newLng,
            }));
            updateTempMarker(parseFloat(newLat), parseFloat(newLng), formData.radiusMeters);
        });

        // Create temp circle
        tempCircleRef.current = new window.google.maps.Circle({
            map: mapInstanceRef.current,
            center: position,
            radius: radius,
            fillColor: '#FF6B35',
            fillOpacity: 0.3,
            strokeColor: '#FF6B35',
            strokeOpacity: 1,
            strokeWeight: 2,
            draggable: false, // Prevent dragging the circle itself
        });

        mapInstanceRef.current.panTo(position);
        mapInstanceRef.current.setZoom(16);
    };

    const clearTempMarker = () => {
        if (tempMarkerRef.current) {
            tempMarkerRef.current.setMap(null);
            tempMarkerRef.current = null;
        }
        if (tempCircleRef.current) {
            tempCircleRef.current.setMap(null);
            tempCircleRef.current = null;
        }
    };

    const openModal = (branch = null) => {
        if (branch) {
            setEditingBranch(branch);
            setFormData({
                name: branch.name,
                address: branch.address || '',
                latitude: branch.latitude.toString(),
                longitude: branch.longitude.toString(),
                radiusMeters: branch.radiusMeters,
                branchType: branch.branchType || 'main',
                isActive: branch.isActive,
            });
            setTimeout(() => {
                updateTempMarker(branch.latitude, branch.longitude, branch.radiusMeters);
            }, 100);
        } else {
            setEditingBranch(null);
            setFormData({
                name: '',
                address: '',
                latitude: '',
                longitude: '',
                radiusMeters: 100,
                branchType: 'main',
                isActive: true,
            });
        }
        setShowModal(true);
        setError('');
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBranch(null);
        setError('');
        clearTempMarker();
        updateMapMarkers();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.name) {
            setError('Branch name is required');
            return;
        }

        if (!formData.latitude || !formData.longitude) {
            setError('Please select a location on the map');
            return;
        }

        try {
            if (editingBranch) {
                await updateBranch(editingBranch.branchId, formData);
                setSuccess('Branch updated successfully');
            } else {
                await createBranch(formData);
                setSuccess('Branch created successfully');
            }
            closeModal();
            loadBranches();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.message || 'Error saving branch');
        }
    };

    const handleDelete = async (branchId) => {
        if (!confirm('Are you sure you want to delete this branch?')) return;

        try {
            await deleteBranch(branchId);
            setSuccess('Branch deleted successfully');
            loadBranches();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.message || 'Error deleting branch');
        }
    };

    const handleRadiusChange = (value) => {
        const radius = parseInt(value) || 100;
        setFormData(prev => ({ ...prev, radiusMeters: radius }));
        if (tempCircleRef.current) {
            tempCircleRef.current.setRadius(radius);
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    setFormData(prev => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                    }));
                    updateTempMarker(parseFloat(lat), parseFloat(lng), formData.radiusMeters);
                    setSuccess('Location retrieved! Click on map to adjust.');
                    setTimeout(() => setSuccess(''), 3000);
                },
                (error) => {
                    setError('Unable to get location: ' + error.message);
                }
            );
        } else {
            setError('Geolocation is not supported');
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="branches-page">
            <div className="page-header">
                <h1 className="page-title">Branches</h1>
                <div className="header-actions">
                    <div className="search-wrapper">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search branches..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <FiPlus /> Add Branch
                    </button>
                </div>
            </div>

            {success && <div className="alert alert-success">{success}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            {/* Map */}
            <div className="map-container">
                <div ref={mapRef} className="google-map"></div>
                <div className="map-legend">
                    <div className="legend-section">
                        <span className="legend-title">Branches</span>
                        <div className="legend-item">
                            <span className="legend-dot main"></span>
                            Main
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot sales"></span>
                            Sales
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot franchise"></span>
                            Franchise
                        </div>
                    </div>
                    <div className="legend-divider"></div>
                    <div className="legend-section">
                        <div className="legend-title-row">
                            <span className="legend-title">Employees</span>
                            <button
                                className={`toggle-btn ${showEmployees ? 'active' : ''}`}
                                onClick={() => setShowEmployees(!showEmployees)}
                            >
                                <FiUsers />
                            </button>
                        </div>
                        {showEmployees && (
                            <>
                                <div className="legend-item">
                                    <span className="legend-arrow inside">▲</span>
                                    Inside
                                </div>
                                <div className="legend-item">
                                    <span className="legend-arrow outside">▲</span>
                                    Outside
                                </div>
                                <div className="legend-item">
                                    <span className="legend-arrow offline">▲</span>
                                    Offline
                                </div>
                                <div className="legend-info">
                                    {employeeLocations.filter(e => e.isOnline).length} online
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Branches List */}
            <div className="card">
                <h2 className="section-title">All Branches ({filteredBranches.length})</h2>
                {filteredBranches.length > 0 ? (
                    <div className="branches-grid">
                        {filteredBranches.map((branch) => (
                            <div key={branch.branchId} className={`branch-card ${!branch.isActive ? 'inactive' : ''}`}>
                                <div className="branch-header">
                                    <div className="branch-icon">
                                        <FiMapPin />
                                    </div>
                                    <div className="branch-status">
                                        <span className={`badge badge-${branch.branchType || 'main'}`}>
                                            {branch.branchType || 'main'}
                                        </span>
                                        {!branch.isActive && (
                                            <span className="badge badge-secondary">Inactive</span>
                                        )}
                                    </div>
                                </div>
                                <h3 className="branch-name">{branch.name}</h3>
                                <p className="branch-address">{branch.address || 'No address provided'}</p>
                                <div className="branch-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Coordinates</span>
                                        <span className="detail-value">{branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Radius</span>
                                        <span className="detail-value">{branch.radiusMeters}m</span>
                                    </div>
                                </div>
                                <div className="branch-actions">
                                    <button className="action-btn edit" onClick={() => openModal(branch)}>
                                        <FiEdit2 /> Edit
                                    </button>
                                    <button className="action-btn delete" onClick={() => handleDelete(branch.branchId)}>
                                        <FiTrash2 /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <FiMapPin className="empty-icon" />
                        <p>No branches added yet</p>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <FiPlus /> Add Your First Branch
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                            </h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {error && <div className="alert alert-danger">{error}</div>}

                            <div className="modal-body-grid">
                                <div className="form-section">
                                    <div className="form-group">
                                        <label className="form-label">Branch Name *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Main Branch"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Address</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Full address"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Branch Type *</label>
                                        <select
                                            className="form-input"
                                            value={formData.branchType}
                                            onChange={(e) => setFormData({ ...formData, branchType: e.target.value })}
                                        >
                                            <option value="main">🏪 Main Branch</option>
                                            <option value="sales">💰 Sales Branch</option>
                                            <option value="franchise">🏬 Franchise</option>
                                            <option value="jv">🤝 Joint Venture (JV)</option>
                                            <option value="retail">🛍️ Retail</option>
                                            <option value="production">🏭 Production</option>
                                        </select>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Latitude</label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                className="form-input"
                                                value={formData.latitude}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, latitude: e.target.value });
                                                    if (formData.longitude && e.target.value) {
                                                        updateTempMarker(parseFloat(e.target.value), parseFloat(formData.longitude), formData.radiusMeters);
                                                    }
                                                }}
                                                placeholder="Click map"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Longitude</label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                className="form-input"
                                                value={formData.longitude}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, longitude: e.target.value });
                                                    if (formData.latitude && e.target.value) {
                                                        updateTempMarker(parseFloat(formData.latitude), parseFloat(e.target.value), formData.radiusMeters);
                                                    }
                                                }}
                                                placeholder="Click map"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-secondary location-btn"
                                        onClick={getCurrentLocation}
                                    >
                                        📍 Use My Location
                                    </button>

                                    <div className="form-group">
                                        <label className="form-label">Radius: {formData.radiusMeters}m</label>
                                        <input
                                            type="range"
                                            min="10"
                                            max="500"
                                            value={formData.radiusMeters}
                                            onChange={(e) => handleRadiusChange(e.target.value)}
                                            className="radius-slider"
                                        />
                                        <div className="radius-labels">
                                            <span>10m</span>
                                            <span>250m</span>
                                            <span>500m</span>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                            <span>Active Branch</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="map-section">
                                    <div className="map-hint">👆 Click on the map to select location</div>
                                    <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '400px' }}></div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingBranch ? 'Update' : 'Create'} Branch
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branches;
