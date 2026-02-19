
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Employees from './pages/Employees';
import EmployeeForm from './pages/EmployeeForm';
import Salary from './pages/Salary';
import Requests from './pages/Requests';
import ChatGroups from './pages/ChatGroups';
import AttendanceReport from './pages/AttendanceReport';
import MobileAttendance from './pages/MobileAttendance';
import KioskAttendance from './pages/KioskAttendance';
import EmployeeRules from './pages/EmployeeRules';
import AttendanceView from './pages/AttendanceView';
import './components/Layout.css'; // Load global CSS

import Login from './pages/Login';

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
          <Route index element={<Employees />} />
          <Route path="employee/add" element={<EmployeeForm />} />
          <Route path="employee/edit/:id" element={<EmployeeForm />} />
          <Route path="salary" element={<Salary />} />
          <Route path="requests" element={<Requests />} />
          <Route path="chat" element={<ChatGroups />} />
          <Route path="attendance-report" element={<AttendanceReport />} />
          <Route path="attendance/mobile" element={<MobileAttendance />} />
          <Route path="attendance/kiosk" element={<KioskAttendance />} />
          <Route path="rules" element={<EmployeeRules />} />
          <Route path="attendance/view/:id" element={<AttendanceView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
