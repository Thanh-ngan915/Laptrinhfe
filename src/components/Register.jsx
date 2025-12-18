import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import websocketService from '../services/websocketService';
import './Auth.css';

function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp!');
            return;
        }

        if (formData.password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }

        // Thử đăng ký trên server qua WebSocket
        websocketService.connect().then(() => {
            const onRegister = (data) => {
                console.log('Register response:', data);
                if (data && (data.status === 'success' || data.event === 'RE_LOGIN')) {
                    setSuccess('Đăng ký thành công! Đang chuyển hướng...');
                    websocketService.off('REGISTER');
                    setTimeout(() => navigate('/login'), 1200);
                } else {
                    // Fallback: nếu server không hỗ trợ REGISTER, lưu local và chuyển hướng
                    const users = JSON.parse(localStorage.getItem('users') || '[]');
                    if (users.some(u => u.email === formData.email)) {
                        setError('Email này đã được đăng ký!');
                        websocketService.off('REGISTER');
                        return;
                    }
                    const newUser = {
                        id: Date.now(),
                        name: formData.name,
                        email: formData.email,
                        password: formData.password
                    };
                    users.push(newUser);
                    localStorage.setItem('users', JSON.stringify(users));
                    setSuccess('Đăng ký thành công (local)! Đang chuyển hướng...');
                    websocketService.off('REGISTER');
                    setTimeout(() => navigate('/login'), 1200);
                }
            };

            websocketService.on('REGISTER', onRegister);
            websocketService.send('REGISTER', { user: formData.name, pass: formData.password });
        }).catch(err => {
            console.error('WS connect error', err);
            setError('Không thể kết nối tới server, đã lưu local');
            // fallback local save
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            users.push({ id: Date.now(), name: formData.name, email: formData.email, password: formData.password });
            localStorage.setItem('users', JSON.stringify(users));
            setSuccess('Đăng ký thành công (local)! Đang chuyển hướng...');
            setTimeout(() => navigate('/login'), 1200);
        });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Đăng Ký</h2>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Họ tên:</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Nhập họ tên"
                        />
                    </div>
                    <div className="form-group">
                        <label>Email:</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="Nhập email"
                        />
                    </div>
                    <div className="form-group">
                        <label>Mật khẩu:</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Nhập mật khẩu"
                        />
                    </div>
                    <div className="form-group">
                        <label>Xác nhận mật khẩu:</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            placeholder="Nhập lại mật khẩu"
                        />
                    </div>
                    <button type="submit" className="btn-submit">Đăng Ký</button>
                </form>
                <p className="auth-link">
                    Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                </p>
            </div>
        </div>
    );
}

export default Register;