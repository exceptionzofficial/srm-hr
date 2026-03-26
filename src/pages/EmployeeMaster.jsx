import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FiUsers, FiPlusCircle, FiBarChart2, FiBriefcase } from 'react-icons/fi';

const EmployeeMaster = () => {
    const location = useLocation();
    
    // Check if we are in Add or Edit mode to show the form tab as active
    const isFormView = location.pathname.includes('/add') || location.pathname.includes('/edit');

    const tabs = [
        { 
            path: '/employee-master/list', 
            label: 'Employee List', 
            icon: <FiUsers />,
            matches: (path) => path === '/employee-master/list' || path === '/employee-master'
        },
        { 
            path: '/employee-master/add', 
            label: 'Add Employee', 
            icon: <FiPlusCircle />,
            matches: (path) => path.includes('/add') || path.includes('/edit')
        },
        { 
            path: '/employee-master/stats', 
            label: 'Statistics', 
            icon: <FiBarChart2 />,
            matches: (path) => path.includes('/stats')
        },
        { 
            path: '/employee-master/designations', 
            label: 'Add Designation', 
            icon: <FiBriefcase />,
            matches: (path) => path.includes('/designations')
        }
    ];

    return (
        <div className="employee-master-wrapper">
            <Outlet />
        </div>
    );
};

export default EmployeeMaster;
