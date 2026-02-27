import React, { useState, useEffect } from 'react';
import { getAllRequests } from '../services/api';
import { FiDollarSign, FiUser, FiCalendar, FiCreditCard, FiClock } from 'react-icons/fi';
import './AdvanceTracking.css';

const AdvanceTracking = () => {
    const [advances, setAdvances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAdvance, setSelectedAdvance] = useState(null);

    useEffect(() => {
        fetchAdvances();
    }, []);

    const fetchAdvances = async () => {
        setLoading(true);
        try {
            const data = await getAllRequests('APPROVED');
            // Filter only ADVANCE types
            const advanceRequests = data.requests.filter(r => r.type === 'ADVANCE');
            setAdvances(advanceRequests);
        } catch (error) {
            console.error('Error fetching advances:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMonthlyAmount = (amount, months) => {
        return Math.ceil(amount / months);
    };

    const generateSchedule = (amount, months, approvedAt) => {
        const schedule = [];
        const emiAmount = Math.ceil(amount / months);
        let current = new Date(approvedAt || Date.now());

        for (let i = 1; i <= months; i++) {
            current = new Date(current.setMonth(current.getMonth() + 1));

            // Calculate amount for this month
            let displayAmount = emiAmount;
            if (i === months) {
                // Last installment: Total - sum of previous installments
                displayAmount = amount - (emiAmount * (months - 1));
            }

            schedule.push({
                month: current.toLocaleString('default', { month: 'long', year: 'numeric' }),
                amount: displayAmount,
                isPast: current < new Date()
            });
        }
        return schedule;
    };

    if (loading) return <div className="tracking-loader">Loading Advance Tracking...</div>;

    return (
        <div className="advance-tracking-page">
            <div className="tracking-header">
                <h1><FiDollarSign /> Advance Repayment Tracking</h1>
                <p>Track approved advances and their monthly EMI schedules.</p>
            </div>

            <div className="tracking-container">
                <div className="advances-list">
                    <div className="section-header">Approved Advances</div>
                    {advances.length === 0 ? (
                        <div className="empty-state">No approved advances found.</div>
                    ) : (
                        advances.map(adv => (
                            <div
                                key={adv.requestId}
                                className={`advance-card ${selectedAdvance?.requestId === adv.requestId ? 'selected' : ''}`}
                                onClick={() => setSelectedAdvance(adv)}
                            >
                                <div className="card-top">
                                    <div className="emp-name">{adv.employeeName}</div>
                                    <div className="adv-amount">₹{adv.data?.amount?.toLocaleString()}</div>
                                </div>
                                <div className="card-details">
                                    <span><FiClock /> {adv.data?.emiMonths} Months Plan</span>
                                    <span><FiCalendar /> Approved: {new Date(adv.updatedAt || adv.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="repayment-detail">
                    {selectedAdvance ? (
                        <div className="detail-panel">
                            <div className="panel-header">
                                <h2>Repayment Schedule</h2>
                                <div className="summary-pills">
                                    <div className="pill">Total: ₹{selectedAdvance.data?.amount?.toLocaleString()}</div>
                                    <div className="pill">Monthly: ₹{getMonthlyAmount(selectedAdvance.data?.amount, selectedAdvance.data?.emiMonths).toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="schedule-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Installment</th>
                                            <th>Month</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {generateSchedule(
                                            selectedAdvance.data?.amount,
                                            selectedAdvance.data?.emiMonths,
                                            selectedAdvance.updatedAt
                                        ).map((item, idx) => (
                                            <tr key={idx} className={item.isPast ? 'past-row' : ''}>
                                                <td>#{idx + 1}</td>
                                                <td>{item.month}</td>
                                                <td>₹{item.amount.toLocaleString()}</td>
                                                <td>
                                                    <span className={`status-tag ${item.isPast ? 'paid' : 'pending'}`}>
                                                        {item.isPast ? 'Collected' : 'Scheduled'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="tracking-notes">
                                <p><strong>Note:</strong> Repayments are typically deducted from the monthly salary. This schedule is based on the approval date.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="select-prompt">
                            <FiCreditCard size={48} />
                            <h3>Select an advance to view schedule</h3>
                            <p>Choose an employee from the left list to see their detailed repayment plan.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvanceTracking;
