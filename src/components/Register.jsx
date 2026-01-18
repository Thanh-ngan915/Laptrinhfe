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
    //sk người dùng gõ vào input
    const handleChange = (e) => {
        setFormData({
            ...formData,// toàn bộ giá trị cũ
            [e.target.name]: e.target.value // cập nhật giá trị mới
        });
    };
    // nhấn dk
    const handleSubmit = (e) => {
        e.preventDefault();// chặn reload trang
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp!');
            return;
        }

        if (formData.password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }

        // đăng ký trên server qua WebSocket
        websocketService.connect().then(() => {
            //đăng ký callback REGISTER để xử lý phản hồi từ server
            const onRegister = (data) => {
                console.log('Register response:', data);
                if (data && (data.status === 'success' || data.event === 'RE_LOGIN')) {
                    setSuccess('Đăng ký thành công! Đang chuyển hướng...');
                    websocketService.off('REGISTER');
                    setTimeout(() => navigate('/login'), 1200);
                } else {
                    const msg = (data && (data.mes || data.message)) || 'Đăng ký thất bại trên server';
                    setError(msg);
                    websocketService.off('REGISTER');
                }
            };
            //dk lắng nghe sự kiện register
            websocketService.on('REGISTER', onRegister);
            websocketService.send('REGISTER', { user: formData.name, pass: formData.password });
        }).catch(err => {
            console.error('WS connect error', err);
            setError('Không thể kết nối tới server');
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