
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Employees from './pages/Employees';
import EmployeeMaster from './pages/EmployeeMaster';
import EmployeeStats from './pages/EmployeeStats';
import EmployeeRules from './pages/EmployeeRules';
import DesignationManager from './pages/DesignationManager';
import PayGroups from './pages/PayGroups';
import EmployeeForm from './pages/EmployeeForm';
import RelievedEmployees from './pages/RelievedEmployees';
import Salary from './pages/Salary';
import Requests from './pages/Requests';
import ChatGroups from './pages/ChatGroups';
import Referrals from './pages/Referrals';
import AttendanceReport from './pages/AttendanceReport';
import MobileAttendance from './pages/MobileAttendance';
import KioskAttendance from './pages/KioskAttendance';
import AttendanceView from './pages/AttendanceView';
import LiveTracking from './pages/LiveTracking';
import AdvanceTracking from './pages/AdvanceTracking';
import WorkTimings from './pages/WorkTimings';
import Branches from './pages/Branches';
import Managers from './pages/Managers';
import ManagerForm from './pages/ManagerForm';
import Documents from './pages/Documents';
import './components/Layout.css';

import Login from './pages/Login'; // Keep existing login import if it was there, assumed line 16

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/employee-master" replace />} />
          
          {/* Employee Master Section */}
          <Route path="employee-master" element={<EmployeeMaster />}>
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={<Employees />} />
            <Route path="add" element={<EmployeeForm />} />
            <Route path="edit/:id" element={<EmployeeForm />} />
            <Route path="stats" element={<EmployeeStats />} />
            <Route path="designations" element={<DesignationManager />} />
            <Route path="pay-groups" element={<PayGroups />} />
            <Route path="managers" element={<Managers />} />
            <Route path="relieved" element={<RelievedEmployees />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="managers/add" element={<ManagerForm />} />
            <Route path="managers/edit/:id" element={<ManagerForm />} />
          </Route>

          <Route path="salary" element={<Salary />} />
          <Route path="requests" element={<Requests />} />
          <Route path="advance" element={<AdvanceTracking />} />
          <Route path="advance/:tab" element={<AdvanceTracking />} />
          <Route path="tracking" element={<LiveTracking />} />
          <Route path="work-timings" element={<WorkTimings />} />
          <Route path="documents" element={<Documents />} />
          <Route path="branches" element={<Branches />} />
          <Route path="chat" element={<ChatGroups />} />
          <Route path="attendance-report" element={<AttendanceReport />} />
          <Route path="attendance/mobile" element={<MobileAttendance />} />
          <Route path="attendance/kiosk" element={<KioskAttendance />} />
          <Route path="rules" element={<EmployeeRules />} />
          <Route path="attendance/view/:id" element={<AttendanceView />} />
          <Route path="*" element={<Navigate to="/employee-master" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
