// src/components/Chat/ConversationsList.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import websocketService from '../../services/websocketService';

function ConversationsList({ conversations, selectedUser, onSelectUser }) {
    const [onlineStatus, setOnlineStatus] = useState({});
    const currentIndexRef = useRef(0);
    const listToCheckRef = useRef([]);
    const isCheckingRef = useRef(false);

    // --- LOGIC CHECK ONLINE (GIỮ NGUYÊN) ---
    useEffect(() => {
        if (!conversations || conversations.length === 0) return;
        listToCheckRef.current = conversations.map(c => typeof c === 'string' ? c : c.name);
        currentIndexRef.current = 0;
        isCheckingRef.current = true;

        const checkNextPerson = () => {
            const idx = currentIndexRef.current;
            const list = listToCheckRef.current;
            if (idx < list.length) {
                websocketService.send('CHECK_USER_ONLINE', { user: list[idx] });
            } else {
                isCheckingRef.current = false;
            }
        };

        const handleCheckResponse = (response) => {
            if (!isCheckingRef.current) return;
            const idx = currentIndexRef.current;
            const list = listToCheckRef.current;
            const currentUser = list[idx];

            if (currentUser) {
                const isOnline = response.data?.status === true;
                setOnlineStatus(prev => ({ ...prev, [currentUser]: isOnline }));
                currentIndexRef.current += 1;
                checkNextPerson();
            }
        };

        websocketService.on('CHECK_USER_ONLINE', handleCheckResponse);
        checkNextPerson();

        return () => {
            isCheckingRef.current = false;
            websocketService.off('CHECK_USER_ONLINE', handleCheckResponse);
        };
    }, [conversations]);

    // --- LOGIC SẮP XẾP (GIỮ NGUYÊN) ---
    const sortedConversations = useMemo(() => {
        return [...conversations].sort((a, b) => {
            const nameA = typeof a === 'string' ? a : a.name;
            const nameB = typeof b === 'string' ? b : b.name;
            const isOnlineA = onlineStatus[nameA] === true;
            const isOnlineB = onlineStatus[nameB] === true;
            if (isOnlineA && !isOnlineB) return -1;
            if (!isOnlineA && isOnlineB) return 1;
            return 0;
        });
    }, [conversations, onlineStatus]);

    return (
        <div className="conversations-list">
            <h3>Direct Messages</h3>
            <ul>
                {sortedConversations.map((conv, index) => {
                    const userName = typeof conv === 'string' ? conv : conv.name;
                    const isSelected = selectedUser === userName;
                    const isOnline = onlineStatus[userName] === true;

                    // --- LOGIC MÀU SẮC MỚI TẠI ĐÂY ---
                    // Nếu Online: Màu Xanh Dương đậm đà (#3498db)
                    // Nếu Offline: Màu Xám nhạt (#bdc3c7)
                    const avatarColor = isOnline ? '#3498db' : '#bdc3c7';

                    return (
                        <li
                            key={index}
                            className={`conversation-item ${isSelected ? 'active' : ''}`}
                            onClick={() => onSelectUser(userName)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px' }}
                        >
                            {/* Avatar Wrapper */}
                            <div className="avatar" style={{ position: 'relative' }}>

                                {/* --- SỬA STYLE BACKGROUND TẠI ĐÂY --- */}
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: avatarColor, // <--- Dùng biến màu vừa tạo
                                    color: '#fff',                // Chữ màu trắng cho nổi
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '18px',
                                    transition: 'background-color 0.3s ease' // Hiệu ứng chuyển màu mượt mà
                                }}>
                                    {userName.charAt(0).toUpperCase()}
                                </div>

                                {/* Chấm trạng thái nhỏ (Vẫn giữ để dễ nhìn) */}
                                <span style={{
                                    position: 'absolute',
                                    bottom: '0', right: '0', width: '12px', height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: isOnline ? '#2ecc71' : '#95a5a6',
                                    border: '2px solid white'
                                }}></span>
                            </div>

                            <div className="info">
                <span className="name" style={{fontWeight: isOnline ? 'bold' : 'normal'}}>
                    {userName}
                </span>
                                <br />
                                <span className="status-text" style={{ fontSize: '11px', color: isOnline ? '#2ecc71' : 'gray' }}>
                  {isOnline ? 'Active now' : 'Offline'}
                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default ConversationsList;