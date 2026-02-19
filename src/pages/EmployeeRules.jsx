import { useState, useEffect } from 'react';
import { getEmployeeRules } from '../services/api';
import './EmployeeRules.css'; // Reusing similar styles or create new

const EmployeeRules = () => {
    const [rules, setRules] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const data = await getEmployeeRules();
            if (data.success && data.rules) {
                setRules(data.rules.rules || '');
            }
        } catch (error) {
            console.error("Error fetching rules:", error);
            setMessage({ type: 'error', text: 'Failed to load rules.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rules-page">
            <header className="page-header">
                <h1>Employee Rules & Guidelines</h1>
                <p>Please read the following company policies carefully.</p>
            </header>

            {message && <div style={{ color: 'red', marginBottom: '1rem' }}>{message.text}</div>}

            <div className="rules-content-container" style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Loading rules...</div>
                ) : (
                    <div className="rules-text" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#374151', fontSize: '1rem' }}>
                        {rules || "No rules defined yet."}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeRules;
