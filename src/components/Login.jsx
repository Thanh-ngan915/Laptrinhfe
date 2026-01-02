import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import websocketService from '../services/websocketService';
import './Auth.css';

function Login() {
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        websocketService.connect().then(() => {
            const onReLogin = (data) => {
                console.log('Login response:', data);

                // Logic check mở rộng
                const isSuccess = data.status === 'success' || data.status === 'ok';
                const isAlreadyLoggedIn = data.mes === 'You are already logged in';
                const isReLogin = data.event === 'RE_LOGIN';

                if (data && (isSuccess || isReLogin || isAlreadyLoggedIn)) {
                    // Thành công
                    const code = data.data?.RE_LOGIN_CODE || null;
                    const userObj = { name: user, user: user, password: password, reLoginCode: code };
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('currentUser', JSON.stringify(userObj));

                    // Cleanup đúng cách
                    websocketService.off('RE_LOGIN', onReLogin);
                    websocketService.off('LOGIN', onReLogin);

                    navigate('/chat');
                } else {
                    // Thất bại
                    setError(data.mes || 'Đăng nhập thất bại');
                    websocketService.off('RE_LOGIN', onReLogin);
                    websocketService.off('LOGIN', onReLogin);
                }
            };

            websocketService.on('RE_LOGIN', onReLogin);
            websocketService.on('LOGIN', onReLogin);

            websocketService.send('LOGIN', { user: user, pass: password });
        }).catch(err => {
            console.error('WS connect error', err);
            setError('Không thể kết nối tới server');
        });
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