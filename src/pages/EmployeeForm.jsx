import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FiArrowLeft, FiUser, FiBriefcase, FiMapPin, FiCreditCard,
    FiFileText, FiBook, FiUsers, FiUpload, FiCheck, FiChevronRight, FiChevronLeft, FiExternalLink
} from 'react-icons/fi';
import {
    getEmployees, createEmployee, updateEmployee, getBranches, getPayGroups,
    sendOTP, verifyOTP, sendSMSOTP, verifySMSOTP, deleteFaceRegistration
} from '../services/api';

const EmployeeForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Steps Configuration
    const steps = [
        { id: 1, title: 'Identity & Work', icon: <FiBriefcase /> },
        { id: 2, title: 'Employment', icon: <FiUser /> },
        { id: 3, title: 'Statutory', icon: <FiFileText /> },
        { id: 4, title: 'Bank', icon: <FiCreditCard /> },
        { id: 5, title: 'Education', icon: <FiBook /> },
        { id: 6, title: 'Experience', icon: <FiBriefcase /> },
        { id: 7, title: 'Family', icon: <FiUsers /> },
        { id: 8, title: 'Documents', icon: <FiUpload /> }
    ];

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState([]);
    const [payGroups, setPayGroups] = useState([]);

    const [formData, setFormData] = useState({
        // Identity
        employeeId: '',
        firstName: '',
        middleName: '',
        lastName: '',
        gender: '',
        fatherName: '',
        dob: '',
        role: 'EMPLOYEE',

        // Work
        branchId: '',
        paygroup: '',
        designation: '',
        department: '',
        natureOfWork: 'non-travel',
        geoFencingEnabled: false,
        workMode: 'OFFICE',
        platformAccess: 'Mobile', // Default to Mobile

        // Employment
        employeeType: 'full-time',
        joinedDate: '',
        residenceLocation: '',

        // Statutory
        isPfEligible: false,
        pfNumber: '',
        esiNumber: '',
        panNumber: '',
        aadharNumber: '',
        uanNumber: '',
        pfAppStatus: '',

        // Bank
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        paymentMode: 'Account Transfer',
        fixedSalary: '',
        basicSalary: '',
        hra: '',
        specialAllowance: '',
        otherAllowance: '',

        // Education
        degree: '',
        college: '',
        yearOfPassing: '',
        percentage: '',

        // Experience
        expOrganization: '',
        expDesignation: '',
        expFromDate: '',
        expToDate: '',
        expYears: '',
        expCtc: '',

        // Family & Personal
        guardianName: '',
        personalMobile: '',
        personalEmail: '',
        address: '',
        bloodGroup: '',
        maritalStatus: '',
        numbChildren: 0,
        isPhysicallyChallenged: false,
        passportNumber: '',
        drivingLicenseNumber: '',
    });

    const [files, setFiles] = useState({
        photo: null,
        aadhar: null,
        pan: null,
        marksheet: null,
        license: null
    });

    const [verification, setVerification] = useState({
        emailVerified: false,
        mobileVerified: false,
        emailOtpSent: false,
        mobileOtpSent: false,
        emailOtp: '',
        mobileOtp: ''
    });

    useEffect(() => {
        loadInitialData();
    }, [id]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [branchRes, payGroupRes] = await Promise.all([
                getBranches().catch(() => ({ branches: [] })),
                getPayGroups().catch(() => ({ payGroups: [] }))
            ]);

            setBranches(branchRes.branches || []);
            setPayGroups(payGroupRes.payGroups || []);

            if (id) {
                const empRes = await getEmployees();
                const emp = empRes.employees?.find(e => e.employeeId === id) || empRes.employees?.find(e => e.employeeId === id.toUpperCase());
                if (emp) {
                    setFormData(prev => ({
                        ...prev,
                        ...emp,
                        ...emp.statutoryDetails,
                        ...emp.bankDetails,
                        ...emp.familyDetails,
                        // Flatten nested arrays
                        degree: emp.academicQualifications?.[0]?.degree || '',
                        college: emp.academicQualifications?.[0]?.college || '',
                        yearOfPassing: emp.academicQualifications?.[0]?.yearOfPassing || '',
                        percentage: emp.academicQualifications?.[0]?.percentage || '',
                        expOrganization: emp.experienceDetails?.[0]?.organization || '',
                        expDesignation: emp.experienceDetails?.[0]?.designation || '',
                        expFromDate: emp.experienceDetails?.[0]?.fromDate || '',
                        expToDate: emp.experienceDetails?.[0]?.toDate || '',
                        expYears: emp.experienceDetails?.[0]?.yearsExp || '',
                        expCtc: emp.experienceDetails?.[0]?.ctc || '',
                        // Salary breakdown
                        basicSalary: emp.salaryBreakdown?.basic || '',
                        hra: emp.salaryBreakdown?.hra || '',
                        specialAllowance: emp.salaryBreakdown?.specialAllowance || '',
                        otherAllowance: emp.salaryBreakdown?.otherAllowance || '',
                    }));

                    // Mark verified if editing existing employee
                    setVerification(prev => ({
                        ...prev,
                        emailVerified: !!emp.familyDetails?.personalEmail,
                        mobileVerified: !!emp.familyDetails?.personalMobile
                    }));
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Reset verification if contact details change
        if (field === 'personalMobile') {
            setVerification(prev => ({
                ...prev,
                mobileVerified: false,
                mobileOtpSent: false,
                mobileOtp: ''
            }));
        }
        if (field === 'personalEmail') {
            setVerification(prev => ({
                ...prev,
                emailVerified: false,
                emailOtpSent: false,
                emailOtp: ''
            }));
        }
    };

    const handleFileChange = (field, e) => {
        const file = e.target.files[0];
        setFiles(prev => ({ ...prev, [field]: file }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Validation Checks
            if (formData.personalEmail && !verification.emailVerified) {
                alert('Please verify your Personal Email before submitting.');
                setLoading(false);
                return;
            }
            if (formData.personalMobile && !verification.mobileVerified) {
                alert('Please verify your Personal Mobile before submitting.');
                setLoading(false);
                return;
            }

            const platformAccess = formData.platformAccess || 'Mobile';
            if (platformAccess === 'Kiosk' && !formData.branchId) {
                alert('Branch is mandatory for Kiosk (Offline) employees');
                setLoading(false);
                return;
            }

            const data = new FormData();
            const payload = {
                ...formData,
                role: 'EMPLOYEE',
                addedBy: id ? undefined : 'HR Team', // HR Portal Logic
                statutoryDetails: {
                    pfNumber: formData.pfNumber,
                    esiNumber: formData.esiNumber,
                    panNumber: formData.panNumber,
                    aadharNumber: formData.aadharNumber,
                    uanNumber: formData.uanNumber,
                    pfAppStatus: formData.pfAppStatus
                },
                bankDetails: {
                    bankName: formData.bankName,
                    accountNumber: formData.accountNumber,
                    ifscCode: formData.ifscCode,
                    paymentMode: formData.paymentMode
                },
                academicQualifications: [{
                    degree: formData.degree,
                    college: formData.college,
                    yearOfPassing: formData.yearOfPassing,
                    percentage: formData.percentage
                }],
                experienceDetails: [{
                    organization: formData.expOrganization,
                    designation: formData.expDesignation,
                    fromDate: formData.expFromDate,
                    toDate: formData.expToDate,
                    yearsExp: formData.expYears,
                    ctc: formData.expCtc
                }],
                salaryBreakdown: {
                    basic: formData.basicSalary,
                    hra: formData.hra,
                    specialAllowance: formData.specialAllowance,
                    otherAllowance: formData.otherAllowance,
                    grossSalary: formData.fixedSalary
                },
                familyDetails: {
                    guardianName: formData.guardianName,
                    personalMobile: formData.personalMobile,
                    personalEmail: formData.personalEmail,
                    address: formData.address,
                    bloodGroup: formData.bloodGroup,
                    maritalStatus: formData.maritalStatus,
                    numbChildren: formData.numbChildren,
                    isPhysicallyChallenged: formData.isPhysicallyChallenged,
                    passportNumber: formData.passportNumber,
                    drivingLicenseNumber: formData.drivingLicenseNumber
                }
            };

            payload.name = `${formData.firstName} ${formData.lastName}`.trim();

            Object.keys(payload).forEach(key => {
                if (payload[key] && typeof payload[key] === 'object') {
                    data.append(key, JSON.stringify(payload[key]));
                } else if (payload[key] !== undefined && payload[key] !== null) {
                    data.append(key, payload[key]);
                }
            });

            if (files.photo) data.append('photo', files.photo);
            if (files.aadhar) data.append('doc_aadhar', files.aadhar);
            if (files.pan) data.append('doc_pan', files.pan);
            if (files.marksheet) data.append('doc_marksheet', files.marksheet);
            if (files.license) data.append('doc_license', files.license);

            if (id) {
                await updateEmployee(id, data);
            } else {
                await createEmployee(data);
            }
            navigate('/');
        } catch (err) {
            console.error('Error saving:', err);
            alert('Error saving employee: ' + (err.response?.data?.message || err.message));
            setLoading(false);
        }
    };

    const handleSendEmailOTP = async () => { if (!formData.personalEmail) return alert('Enter email'); await sendOTP(formData.personalEmail); setVerification(p => ({ ...p, emailOtpSent: true })); alert('OTP Sent'); };
    const handleVerifyEmailOTP = async () => { if (!verification.emailOtp) return alert('Enter OTP'); try { await verifyOTP(formData.personalEmail, verification.emailOtp); setVerification(p => ({ ...p, emailVerified: true })); alert('Verified!'); } catch (e) { alert('Invalid OTP'); } };
    const handleSendMobileOTP = async () => { if (!formData.personalMobile) return alert('Enter mobile'); await sendSMSOTP(formData.personalMobile); setVerification(p => ({ ...p, mobileOtpSent: true })); alert('OTP Sent'); };
    const handleVerifyMobileOTP = async () => { if (!verification.mobileOtp) return alert('Enter OTP'); try { await verifySMSOTP(formData.personalMobile, verification.mobileOtp); setVerification(p => ({ ...p, mobileVerified: true })); alert('Verified!'); } catch (e) { alert('Invalid OTP'); } };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg">
                    <FiArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold">{id ? 'Edit Employee' : 'Onboard New Employee'}</h1>
            </div>

            <div style={{ marginBottom: '48px', marginTop: '32px' }}>
                <div style={{ position: 'relative', padding: '0 10px' }}>
                    <div style={{ position: 'absolute', top: '20px', left: '0', right: '0', height: '3px', backgroundColor: '#E5E7EB', transform: 'translateY(-50%)', borderRadius: '99px', zIndex: 0 }}></div>
                    <div style={{ position: 'absolute', top: '20px', left: '0', height: '3px', backgroundColor: '#22C55E', transform: 'translateY(-50%)', borderRadius: '99px', zIndex: 0, transition: 'width 0.3s ease', width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
                        {steps.map((s) => {
                            const isActive = currentStep === s.id;
                            const isCompleted = currentStep > s.id;
                            return (
                                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', width: '40px', position: 'relative' }} onClick={() => currentStep > s.id && setCurrentStep(s.id)}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${isActive || isCompleted ? '#22C55E' : '#E5E7EB'}`, backgroundColor: isActive ? '#16A34A' : isCompleted ? '#22C55E' : '#FFFFFF', color: isActive || isCompleted ? '#FFFFFF' : '#9CA3AF', transition: 'all 0.3s ease', boxShadow: isActive ? '0 0 0 4px rgba(34, 197, 94, 0.2)' : 'none', transform: isActive ? 'scale(1.1)' : 'scale(1)', marginBottom: '8px' }}>
                                        {isCompleted ? <FiCheck size={20} /> : <span style={{ fontSize: '18px', display: 'flex' }}>{s.icon}</span>}
                                    </div>
                                    <div className="hidden md:block" style={{ fontSize: '11px', fontWeight: isActive ? '600' : '500', color: isActive ? '#16A34A' : '#6B7280', textAlign: 'center', position: 'absolute', top: s.id % 2 === 0 ? '-25px' : '48px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{s.title}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 min-h-[500px] mb-8 animate-fade-in relative">

                {currentStep === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full"><h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiBriefcase className="text-blue-500" /> Identity & Work Details</h3></div>
                        <div className="form-group"><label className="label">Branch</label><select className="input" value={formData.branchId} onChange={e => handleChange('branchId', e.target.value)}><option value="">Select Branch</option>{branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}</select></div>
                        {payGroups.length > 0 && (<div className="form-group"><label className="label">Pay Group</label><select className="input" value={formData.paygroup} onChange={e => handleChange('paygroup', e.target.value)}><option value="">Select Pay Group</option>{payGroups.map(p => <option key={p.payGroupId} value={p.payGroupId}>{p.name}</option>)}</select></div>)}

                        {id && (
                            <div className="form-group"><label className="label">Employee ID</label><input type="text" className="input" value={formData.employeeId} disabled={true} /></div>
                        )}

                        <div className="form-group"><label className="label">First Name</label><input type="text" className="input" value={formData.firstName} onChange={e => handleChange('firstName', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Last Name</label><input type="text" className="input" value={formData.lastName} onChange={e => handleChange('lastName', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Gender</label><select className="input" value={formData.gender} onChange={e => handleChange('gender', e.target.value)}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                        <div className="form-group"><label className="label">Father's Name</label><input type="text" className="input" value={formData.fatherName} onChange={e => handleChange('fatherName', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Designation</label><input type="text" className="input" value={formData.designation} onChange={e => handleChange('designation', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Nature of Work</label><select className="input" value={formData.natureOfWork} onChange={e => handleChange('natureOfWork', e.target.value)}><option value="non-travel">Non-Travel (Stationary)</option><option value="travel">Travel (Field Work)</option></select></div>
                        <div className="form-group"><label className="label">Platform Access</label><select className="input" value={formData.platformAccess} onChange={e => handleChange('platformAccess', e.target.value)}><option value="Mobile">Mobile App</option><option value="Kiosk">Kiosk Mode</option></select></div>

                        {formData.natureOfWork === 'travel' && (
                            <div className="col-span-full p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                                <div><h4 className="font-semibold text-blue-900">Geo-Fencing Requirement</h4><p className="text-sm text-blue-700">Require location check between branches?</p></div>
                                <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={formData.geoFencingEnabled} onChange={e => handleChange('geoFencingEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div></label>
                            </div>
                        )}

                        {id && (
                            <div className="col-span-full flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div><h4 className="font-bold text-red-700">Face Registration</h4><p className="text-sm text-red-800">Reset face ID if employee needs to re-register.</p></div>
                                <button type="button" onClick={async () => { if (confirm('Reset Face ID?')) { try { await deleteFaceRegistration(id); alert('Reset Successfully'); } catch (e) { alert('Failed'); } } }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Reset Face ID</button>
                            </div>
                        )}
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full"><h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiUser className="text-purple-500" /> Employment Details</h3></div>
                        <div className="form-group"><label className="label">Date of Joining</label><input type="date" className="input" value={formData.joinedDate} onChange={e => handleChange('joinedDate', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Date of Birth</label><input type="date" className="input" value={formData.dob} onChange={e => handleChange('dob', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Employee Type</label><select className="input" value={formData.employeeType} onChange={e => handleChange('employeeType', e.target.value)}><option value="full-time">Full Time</option><option value="part-time">Part Time</option><option value="seasonal">Seasonal</option><option value="contract">Contract</option><option value="shift">Shift</option><option value="mobile">Mobile App</option><option value="kiosk">Kiosk</option></select></div>
                        <div className="form-group md:col-span-2"><label className="label">Residence Location</label><textarea className="input" rows="2" value={formData.residenceLocation} onChange={e => handleChange('residenceLocation', e.target.value)} placeholder="Address" /></div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full"><h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiFileText className="text-orange-500" /> Statutory & Compliance</h3></div>
                        <div className="col-span-full flex items-center gap-3 p-4 bg-gray-50 rounded-lg"><input type="checkbox" id="pf" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={formData.isPfEligible} onChange={e => handleChange('isPfEligible', e.target.checked)} /><label htmlFor="pf" className="font-medium text-gray-700">Eligible for PF?</label></div>
                        {formData.isPfEligible && (
                            <>
                                <div className="form-group"><label className="label">PF Number</label><input type="text" className="input" value={formData.pfNumber} onChange={e => handleChange('pfNumber', e.target.value)} /></div>
                                <div className="form-group"><label className="label">UAN Number</label><input type="text" className="input" value={formData.uanNumber} onChange={e => handleChange('uanNumber', e.target.value)} /></div>
                                <div className="form-group"><label className="label">ESI Number</label><input type="text" className="input" value={formData.esiNumber} onChange={e => handleChange('esiNumber', e.target.value)} /></div>
                                <div className="form-group"><label className="label">PF Application Status</label><select className="input" value={formData.pfAppStatus} onChange={e => handleChange('pfAppStatus', e.target.value)}><option value="">Select</option><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="approved">Approved</option></select></div>
                            </>
                        )}
                        <div className="form-group"><label className="label">PAN Number</label><input type="text" className="input" value={formData.panNumber} onChange={e => handleChange('panNumber', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Aadhar Number</label><input type="text" className="input" value={formData.aadharNumber} onChange={e => handleChange('aadharNumber', e.target.value)} /></div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full"><h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiCreditCard className="text-green-600" /> Bank Details</h3></div>
                        <div className="form-group"><label className="label">Bank Name</label><input type="text" className="input" value={formData.bankName} onChange={e => handleChange('bankName', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Account Number</label><input type="text" className="input" value={formData.accountNumber} onChange={e => handleChange('accountNumber', e.target.value)} /></div>
                        <div className="form-group"><label className="label">IFSC Code</label><input type="text" className="input uppercase" value={formData.ifscCode} onChange={e => handleChange('ifscCode', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Payment Mode</label><select className="input" value={formData.paymentMode} onChange={e => handleChange('paymentMode', e.target.value)}><option value="Account Transfer">Account Transfer</option><option value="Cash">Cash</option><option value="Cheque">Cheque</option></select></div>
                        <div className="form-group"><label className="label">Total Gross Salary (Monthly)</label><input type="number" className="input font-bold" value={formData.fixedSalary} onChange={e => handleChange('fixedSalary', e.target.value)} placeholder="e.g. 25000" /></div>

                        <div className="col-span-full border-t pt-4 mt-2">
                            <h4 className="text-sm font-bold text-gray-700 mb-4">Monthly Salary Breakdown</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group"><label className="label text-xs">Basic Salary</label><input type="number" className="input py-2 text-sm" value={formData.basicSalary} onChange={e => handleChange('basicSalary', e.target.value)} placeholder="Basic" /></div>
                                <div className="form-group"><label className="label text-xs">HRA</label><input type="number" className="input py-2 text-sm" value={formData.hra} onChange={e => handleChange('hra', e.target.value)} placeholder="HRA" /></div>
                                <div className="form-group"><label className="label text-xs">Special Allowance</label><input type="number" className="input py-2 text-sm" value={formData.specialAllowance} onChange={e => handleChange('specialAllowance', e.target.value)} placeholder="Special" /></div>
                                <div className="form-group"><label className="label text-xs">Other Allowance</label><input type="number" className="input py-2 text-sm" value={formData.otherAllowance} onChange={e => handleChange('otherAllowance', e.target.value)} placeholder="Other" /></div>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 italic">* These components will be used for automated PF and salary slip generation.</p>
                        </div>
                    </div>
                )}

                {currentStep === 5 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full"><h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiBook className="text-indigo-500" /> Education</h3></div>
                        <div className="form-group"><label className="label">Degree</label><input type="text" className="input" value={formData.degree} onChange={e => handleChange('degree', e.target.value)} /></div>
                        <div className="form-group"><label className="label">College</label><input type="text" className="input" value={formData.college} onChange={e => handleChange('college', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Year</label><input type="text" className="input" value={formData.yearOfPassing} onChange={e => handleChange('yearOfPassing', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Percentage</label><input type="text" className="input" value={formData.percentage} onChange={e => handleChange('percentage', e.target.value)} /></div>
                    </div>
                )}

                {currentStep === 6 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full"><h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiBriefcase className="text-yellow-600" /> Experience</h3></div>
                        <div className="form-group"><label className="label">Organization</label><input type="text" className="input" value={formData.expOrganization} onChange={e => handleChange('expOrganization', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Designation</label><input type="text" className="input" value={formData.expDesignation} onChange={e => handleChange('expDesignation', e.target.value)} /></div>
                        <div className="form-group"><label className="label">From</label><input type="date" className="input" value={formData.expFromDate} onChange={e => handleChange('expFromDate', e.target.value)} /></div>
                        <div className="form-group"><label className="label">To</label><input type="date" className="input" value={formData.expToDate} onChange={e => handleChange('expToDate', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Years Exp</label><input type="number" className="input" value={formData.expYears} onChange={e => handleChange('expYears', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Last CTC</label><input type="number" className="input" value={formData.expCtc} onChange={e => handleChange('expCtc', e.target.value)} /></div>
                    </div>
                )}

                {currentStep === 7 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full"><h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiUsers className="text-pink-500" /> Family & Personal Details</h3></div>
                        <div className="form-group">
                            <label className="label">Personal Mobile</label>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input type="text" className={`input flex-1 ${verification.mobileVerified ? 'bg-green-50' : ''}`} value={formData.personalMobile} onChange={e => handleChange('personalMobile', e.target.value)} disabled={verification.mobileVerified} />
                                    {!verification.mobileVerified && !verification.mobileOtpSent && <button onClick={handleSendMobileOTP} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Verify</button>}
                                </div>
                                {verification.mobileOtpSent && !verification.mobileVerified && (
                                    <div className="flex gap-2 items-center">
                                        <input type="text" className="input w-24" placeholder="OTP" value={verification.mobileOtp} onChange={e => setVerification(p => ({ ...p, mobileOtp: e.target.value }))} />
                                        <button onClick={handleVerifyMobileOTP} className="px-4 py-2 bg-green-600 text-white rounded-lg">Submit</button>
                                        <button onClick={handleSendMobileOTP} className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium">Resend</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Personal Email</label>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input type="text" className={`input flex-1 ${verification.emailVerified ? 'bg-green-50' : ''}`} value={formData.personalEmail} onChange={e => handleChange('personalEmail', e.target.value)} disabled={verification.emailVerified} />
                                    {!verification.emailVerified && !verification.emailOtpSent && <button onClick={handleSendEmailOTP} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Verify</button>}
                                </div>
                                {verification.emailOtpSent && !verification.emailVerified && (
                                    <div className="flex gap-2 items-center">
                                        <input type="text" className="input w-24" placeholder="OTP" value={verification.emailOtp} onChange={e => setVerification(p => ({ ...p, emailOtp: e.target.value }))} />
                                        <button onClick={handleVerifyEmailOTP} className="px-4 py-2 bg-green-600 text-white rounded-lg">Submit</button>
                                        <button onClick={handleSendEmailOTP} className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium">Resend</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group"><label className="label">Current Address</label><input type="text" className="input" value={formData.address} onChange={e => handleChange('address', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Blood Group</label><input type="text" className="input" value={formData.bloodGroup} onChange={e => handleChange('bloodGroup', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Marital Status</label><input type="text" className="input" value={formData.maritalStatus} onChange={e => handleChange('maritalStatus', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Guardian Name</label><input type="text" className="input" value={formData.guardianName} onChange={e => handleChange('guardianName', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Number of Children</label><input type="text" className="input" value={formData.numbChildren} onChange={e => handleChange('numbChildren', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Passport</label><input type="text" className="input" value={formData.passportNumber} onChange={e => handleChange('passportNumber', e.target.value)} /></div>
                        <div className="form-group"><label className="label">Driving License</label><input type="text" className="input" value={formData.drivingLicenseNumber} onChange={e => handleChange('drivingLicenseNumber', e.target.value)} /></div>
                        <div className="col-span-full flex items-center gap-3 p-4 bg-gray-50 rounded-lg"><input type="checkbox" className="w-5 h-5" checked={formData.isPhysicallyChallenged} onChange={e => handleChange('isPhysicallyChallenged', e.target.checked)} /><label className="font-medium text-gray-700">Physically Challenged?</label></div>
                    </div>
                )}

                {currentStep === 8 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full"><h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiUpload className="text-gray-500" /> Documents</h3></div>

                        {[
                            { label: 'Photo', key: 'photo', url: formData.documents?.photoUrl || formData.photoUrl },
                            { label: 'Aadhar Card', key: 'aadhar', url: formData.documents?.aadharUrl },
                            { label: 'PAN Card', key: 'pan', url: formData.documents?.panUrl },
                            { label: 'Marksheet', key: 'marksheet', url: formData.documents?.marksheetUrl },
                            { label: 'Driving License', key: 'license', url: formData.documents?.licenseUrl }
                        ].map((doc) => (
                            <div className="form-group" key={doc.key}>
                                <label className="label">{doc.label}</label>
                                <div className="flex flex-col gap-2">
                                    {doc.url && (
                                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-1 font-medium bg-blue-50 p-2 rounded w-fit">
                                            <FiExternalLink /> View {doc.label}
                                        </a>
                                    )}
                                    <input type="file" className="input" accept={doc.key === 'photo' ? 'image/*' : undefined} onChange={e => handleFileChange(doc.key, e)} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '32px' }}>
                    <button
                        onClick={() => setCurrentStep(c => Math.max(1, c - 1))}
                        disabled={currentStep === 1}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '12px',
                            fontWeight: 500,
                            border: currentStep === 1 ? '1px solid #e5e7eb' : '1px solid #000',
                            backgroundColor: 'transparent',
                            color: currentStep === 1 ? '#9ca3af' : '#000',
                            cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentStep === 1 ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <FiChevronLeft /> Previous
                    </button>

                    {currentStep < steps.length ? (
                        <button
                            onClick={() => setCurrentStep(c => Math.min(steps.length, c + 1))}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '12px',
                                fontWeight: 500,
                                backgroundColor: '#000',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Next <FiChevronRight />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{
                                padding: '10px 32px',
                                borderRadius: '12px',
                                fontWeight: 500,
                                background: 'linear-gradient(to right, #16a34a, #22c55e)',
                                color: '#fff',
                                border: 'none',
                                cursor: loading ? 'wait' : 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'Saving...' : (id ? 'Update Employee' : 'Submit Registration')}
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem; }
                .input { width: 100%; padding: 0.75rem 1rem; border-radius: 0.75rem; border: 1px solid #e5e7eb; outline: none; transition: all; }
                .input:focus { border-color: #000; ring: 2px solid #0000000d; }
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};
export default EmployeeForm;
