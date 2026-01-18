import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import websocketService from '../services/websocketService';
import './Auth.css';

function Login() {
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();//chuyển trang
    //nhấn đk hàm chạy
    const handleSubmit = (e) => {
        e.preventDefault();// chặn reload trang
        setError('');
        // Kết nối WS và gửi yêu cầu đăng nhập
        websocketService.connect().then(() => {
            //dc goi khi server gửi login và relogin
            const onReLogin = (data) => {
                console.log('Login response:', data);

                //kt
                const isSuccess = data.status === 'success' || data.status === 'ok';
                const isAlreadyLoggedIn = data.mes === 'You are already logged in';
                const isReLogin = data.event === 'RE_LOGIN';//yc reLogin

                if (data && (isSuccess || isReLogin || isAlreadyLoggedIn)) {
                    // Thành công: chỉ lưu thông tin cần thiết, không lưu mật khẩu
                    const code = data.data?.RE_LOGIN_CODE || null;
                    const userObj = { name: user, user: user, reLoginCode: code };
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('currentUser', JSON.stringify(userObj));

                    // dọn listeners sau khi đn và chuyển trang
                    websocketService.off('RE_LOGIN', onReLogin);
                    websocketService.off('LOGIN', onReLogin);

                    navigate('/chat');
                } else {
                    // Thất bại
                    setError(data.mes || 'Đăng nhập thất bại');//báo lỗi
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