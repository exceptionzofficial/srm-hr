import React, { useState, useEffect, useRef } from 'react';
import { getAllEmployeeLocations } from '../services/api';
import './LiveTracking.css';
import { FiMapPin, FiRefreshCw, FiNavigation, FiClock } from 'react-icons/fi';

const LiveTracking = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [activeCount, setActiveCount] = useState(0);
    const [onlineCount, setOnlineCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markersRef = useRef({});
    const infoWindowsRef = useRef({});
    const GOOGLE_MAPS_API_KEY = 'AIzaSy' + 'DOTCfq7Duq1KGuNKFVU1KPtEqmJVPNU1Y';

    const loadData = async () => {
        try {
            // Determine Branch Context based on Role
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = (user.role || '').toUpperCase();
            const userBranchId = user.branchId;
            const allowedAdminRoles = ['HR', 'SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'BRANCH_MANAGER', 'CLUSTER_MANAGER', 'MANAGER'];

            let queryBranchId = null;
            if (!allowedAdminRoles.includes(userRole)) {
                if (userBranchId) {
                    queryBranchId = userBranchId;
                }
            }

            console.log(`[Tracking] Role: ${userRole}, QueryBranchId: ${queryBranchId}`);
            const data = await getAllEmployeeLocations(queryBranchId);
            console.log(`[Tracking] Received ${data.employees?.length || 0} employees from API`);

            if (data.success) {
                // HR PORTAL REQUIREMENT: Show ONLY employees who are on active travel
                const travelingEmployees = data.employees.filter(emp => !!emp.tripDetails);
                console.log(`[Tracking] Found ${travelingEmployees.length} traveling employees`);
                
                setEmployees(travelingEmployees);
                setActiveCount(travelingEmployees.length);
                setTotalCount(data.employees.length); // Total employees fetched, not just tracking

                // Count online employees from the full list for stats
                setOnlineCount(data.employees.filter(e => e.isOnline).length);

                setLastUpdated(new Date());
                updateMapMarkers(travelingEmployees);
            }
        } catch (error) {
            console.error('Failed to load locations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000);

        // Ensure DOM is ready before initMap
        const timeout = setTimeout(initMap, 500);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
            // Cleanup markers
            Object.values(markersRef.current).forEach(marker => marker.setMap(null));
            markersRef.current = {};
            googleMapRef.current = null;
        };
    }, []);

    const initMap = () => {
        const mapContainer = document.getElementById('live-field-map');
        if (!mapContainer) {
            console.log('Map container not found, retrying...');
            setTimeout(initMap, 500);
            return;
        }

        if (!window.google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,places`;
            script.async = true;
            script.defer = true;
            script.onload = () => setupGoogleMap();
            document.head.appendChild(script);
        } else {
            setupGoogleMap();
        }
    };

    const setupGoogleMap = () => {
        if (googleMapRef.current) return;

        const map = new window.google.maps.Map(document.getElementById('live-field-map'), {
            center: { lat: 11.0168, lng: 76.9558 },
            zoom: 10,
            mapId: 'DEMO_MAP_ID',
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }
            ]
        });

        googleMapRef.current = map;
        setMapLoaded(true);
    };

    const updateMapMarkers = (employeesData) => {
        if (!window.google || !googleMapRef.current) return;
        const map = googleMapRef.current;

        // Clear existing markers that are NOT in the new data
        const currentEmpIds = employeesData.map(e => e.employeeId);
        Object.keys(markersRef.current).forEach(id => {
            if (!currentEmpIds.includes(id)) {
                    markersRef.current[id].setMap(null);
                    delete markersRef.current[id];
                }
                if (infoWindowsRef.current[id]) {
                    delete infoWindowsRef.current[id];
                }
            });

            employeesData.forEach(emp => {
                if (emp.lastLocation && emp.lastLocation.latitude) {
                    const position = {
                        lat: parseFloat(emp.lastLocation.latitude),
                        lng: parseFloat(emp.lastLocation.longitude)
                    };

                    const infoWindowContent = `<div style="padding: 10px; color: #333; font-family: Inter, sans-serif; min-width: 150px;">
                        <h4 style="margin: 0 0 5px 0; color: #EF4136; font-size: 14px;">${emp.name}</h4>
                        <p style="margin: 0; font-size: 12px;"><b>Dept:</b> ${emp.department}</p>
                        ${emp.tripDetails ? `<p style="margin: 5px 0 0 0; font-size: 12px;"><b>To:</b> ${emp.tripDetails.destination}</p>` : ''}
                        <p style="margin: 8px 0 0 0; font-weight: bold; color: #3b82f6; font-size: 11px; text-transform: uppercase;">Live Tracking</p>
                    </div>`;

                    if (markersRef.current[emp.employeeId]) {
                        markersRef.current[emp.employeeId].setPosition(position);
                        // Update existing info window content
                        if (infoWindowsRef.current[emp.employeeId]) {
                            infoWindowsRef.current[emp.employeeId].setContent(infoWindowContent);
                        }
                    } else {
                        const marker = new window.google.maps.Marker({
                            position: position,
                            map: map,
                            title: emp.name,
                            icon: {
                                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                                fillColor: '#EF4136',
                                fillOpacity: 1,
                                strokeWeight: 2,
                                strokeColor: '#ffffff',
                                scale: 2,
                                anchor: new window.google.maps.Point(12, 22)
                            }
                        });

                        const infoWindow = new window.google.maps.InfoWindow({
                            content: infoWindowContent
                        });

                        marker.addListener('click', () => {
                            // Close other info windows if needed? Google Maps usually does this or we can manage it.
                            infoWindow.open(map, marker);
                        });

                        markersRef.current[emp.employeeId] = marker;
                        infoWindowsRef.current[emp.employeeId] = infoWindow;
                    }
                }
            });
        };

    const getStatusClass = (emp) => {
        if (emp.isTracking) return 'tracking';
        if (emp.isOnline) return 'online';
        return 'offline';
    };

    const getStatusLabel = (emp) => {
        if (emp.isTracking) return 'Tracking Live';
        if (emp.isOnline) return 'Online';
        return 'Offline';
    };

    const formatTime = (isoString) => {
        if (!isoString) return 'Unknown';
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
        } catch (e) {
            return 'Unknown';
        }
    };

    const formatStationaryTime = (mins) => {
        if (!mins || mins < 0) return null;
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hrs}h ${remainingMins}m`;
    };

    const formatDistance = (meters) => {
        if (!meters && meters !== 0) return '-';
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1000).toFixed(2)}km`;
    };

    // Stats are now managed via state from loadData

    return (
        <div className="live-tracking-page">
            {loading && employees.length === 0 ? (
                <div className="loading-state">Loading location data...</div>
            ) : (
                <div className="dashboard-layout">
                    <div className="sidebar-container">
                        <div className="sidebar-header">
                            <div>
                                <h2 className="sidebar-title">Live Tracking</h2>
                                <p className="sidebar-subtitle">Field staff updates</p>
                            </div>
                            <button className="sidebar-refresh-btn" onClick={loadData} disabled={loading}>
                                <FiRefreshCw className={loading ? 'spin' : ''} />
                            </button>
                        </div>

                        <div className="search-bar-container">
                            <FiMapPin className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search employee or department..."
                                className="tracking-search-input"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="employee-list-scroll">
                            {employees
                                .filter(emp =>
                                    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map(emp => (
                                    <div
                                        key={emp.employeeId}
                                        className={`employee-list-card ${getStatusClass(emp)}`}
                                        onClick={() => {
                                            if (googleMapRef.current && emp.lastLocation) {
                                                const lat = parseFloat(emp.lastLocation.latitude);
                                                const lng = parseFloat(emp.lastLocation.longitude);
                                                
                                                if (isNaN(lat) || isNaN(lng)) {
                                                    console.error('Invalid location coordinates', emp.lastLocation);
                                                    return;
                                                }

                                                const pos = { lat, lng };
                                                const map = googleMapRef.current;
                                                
                                                // Smooth animation and zoom
                                                map.panTo(pos);
                                                map.setZoom(16);

                                                // Open InfoWindow programmatically
                                                if (infoWindowsRef.current[emp.employeeId] && markersRef.current[emp.employeeId]) {
                                                    // Close all others first
                                                    Object.values(infoWindowsRef.current).forEach(iw => iw.close());
                                                    infoWindowsRef.current[emp.employeeId].open(map, markersRef.current[emp.employeeId]);
                                                }
                                            } else {
                                                console.warn('No location available for', emp.name);
                                            }
                                        }}
                                    >
                                    <div className="list-card-header">
                                        <div className="list-card-main">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h4 className="list-emp-name">{emp.name}</h4>
                                                {emp.tripDetails && <span className="travel-badge">TRAVEL</span>}
                                                {emp.stationaryMinutes >= 10 && (
                                                    <span className="stationary-badge">
                                                        STATIONARY {formatStationaryTime(emp.stationaryMinutes)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="list-emp-dept">{emp.department}</p>
                                        </div>
                                        <span className={`list-status-dot ${getStatusClass(emp)}`}></span>
                                    </div>
                                    <div className="list-card-footer">
                                        <div className="trip-summary">
                                            {emp.tripDetails && (
                                                <div className="destination-info">
                                                    <FiNavigation size={12} />
                                                    <span className="dest-text" title={emp.tripDetails.destination}>
                                                        {emp.tripDetails.destination}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="footer-stats">
                                                <span className="list-time">
                                                    <FiClock /> {emp.lastLocation ? formatTime(emp.lastLocation.timestamp) : '--:--'}
                                                </span>
                                                <span className="list-dist">
                                                    {emp.tripDetails ? formatDistance(emp.tripDetails.totalDistance) : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="main-content-area">
                        <div className="live-map-wrapper">
                            {!mapLoaded && (
                                <div className="map-placeholder">
                                    <FiRefreshCw className="spin" size={32} />
                                    <p style={{ marginTop: 15 }}>Initializing Google Maps...</p>
                                </div>
                            )}
                            <div
                                id="live-field-map"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    visibility: mapLoaded ? 'visible' : 'hidden'
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveTracking;
