import React from 'react';
import { useNavigate, Link } from 'react-router-dom';


import './Home.css';

function Home() {
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
        navigate('/login');
    };

    return (
        <div className="home-container">
            <div className="home-card">
                <h1>Chào mừng, {currentUser.name}! 🎉</h1>
                <p>Email: {currentUser.email}</p>
                <p>Bạn đã đăng nhập thành công vào hệ thống.</p>
                <div className="button-group">
                    <Link to="/chat" className="btn-chat">
                        💬 Vào phòng chat
                    </Link>
                    <button onClick={handleLogout} className="btn-logout">
                        Đăng Xuất
                    </button>
                </div>

            </div>
        </div>
    );
}

export default Home;