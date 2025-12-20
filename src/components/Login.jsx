import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import websocketService from '../services/websocketService';
import './Auth.css';

function Login() {
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // 1. Đợi kết nối thành công trước
            await websocketService.connect();

            // 2. Định nghĩa hàm xử lý kết quả login
            const handleLoginResponse = (data) => {
                console.log('Login response:', data);

                // Logic kiểm tra thành công (bao gồm cả trường hợp server báo lỗi "đã login")
                const isSuccess = data.status === 'success' || data.status === 'ok';
                const isAlreadyLoggedIn = data.status === 'error' && data.mes === 'You are already logged in';

                if (data && (isSuccess || data.event === 'RE_LOGIN' || isAlreadyLoggedIn)) {
                    // Lưu thông tin user
                    const code = data.data?.RE_LOGIN_CODE || null;
                    const userObj = {
                        name: user,
                        user: user,
                        password: password,
                        reLoginCode: code
                    };

                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('currentUser', JSON.stringify(userObj));

                    // Dọn dẹp listeners trước khi chuyển trang
                    websocketService.off('RE_LOGIN');
                    websocketService.off('LOGIN');

                    navigate('/chat');
                } else {
                    // Xử lý thất bại
                    setError(data.mes || 'Đăng nhập thất bại');
                    // Không tắt listener vội, để user có thể thử lại
                }
            };

            // 3. Đăng ký lắng nghe
            websocketService.on('LOGIN', handleLoginResponse);
            websocketService.on('RE_LOGIN', handleLoginResponse);

            // 4. Gửi lệnh Login
            websocketService.send('LOGIN', { user: user, pass: password });

        } catch (err) {
            console.error('WS connect error', err);
            setError('Không thể kết nối tới server. Vui lòng thử lại.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Đăng Nhập</h2>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Tên đăng nhập:</label>
                            <input
                                type="text"
                                value={user}
                                onChange={(e) => setUser(e.target.value)}
                                required
                                placeholder="Nhập tên đăng nhập của bạn"
                            />
                    </div>
                    <div className="form-group">
                        <label>Mật khẩu:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Nhập mật khẩu"
                        />
                    </div>
                    <button type="submit" className="btn-submit">Đăng Nhập</button>
                </form>
                <p className="auth-link">
                    Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;