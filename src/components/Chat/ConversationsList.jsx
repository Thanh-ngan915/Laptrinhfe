// src/components/Chat/ConversationsList.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import websocketService from '../../services/websocketService';

function ConversationsList({ conversations, selectedUser, onSelectUser }) {
  const [onlineStatus, setOnlineStatus] = useState({});
  const currentIndexRef = useRef(0);// con trỏ đang check ai
  const listToCheckRef = useRef([]);
  const isCheckingRef = useRef(false);//cờ trạng thái đang check

  // check online
  useEffect(() => {
    // k có cuộc hội thoại
    if (!conversations || conversations.length === 0) return;
    // chuẩn hóa
    listToCheckRef.current = conversations.map(c => typeof c === 'string' ? c : c.name);
    currentIndexRef.current = 0; // check từ đầu
    isCheckingRef.current = true;

    // kiểm tra người tiếp theo
    const checkNextPerson = () => {
      const idx = currentIndexRef.current;// index hiện tại
      const list = listToCheckRef.current; //ds cần check
      if (idx < list.length) {// còn người để check
        websocketService.send('CHECK_USER_ONLINE', { user: list[idx] });// gửi yêu cầu check
      } else {
        isCheckingRef.current = false;
      }
    };
    // xử lý phản hồi từ server, cb
    const handleCheckResponse = (response) => {
      if (!isCheckingRef.current) return;
      // lấy user từ phản hồi
      const reportedUser = response?.data?.user || response?.user;
      const idx = currentIndexRef.current;
      const list = listToCheckRef.current;
      // Ưu tiên user trong payload, fallback theo thứ tự gửi
      const currentUser = reportedUser || list[idx];
      // sử lí tiếp tục khi nhận đ user
      if (currentUser) {
        const statusField = response?.data?.status;
        const success = response?.status === 'success' || response?.status === true;
        const isOnline = statusField === true || (success && statusField !== false);
        // update trạng thái
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

  // ghi nhớ kết quả tính toán
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {//tạo bản sao an toàn
      //chuẩn hóa tên
      const nameA = typeof a === 'string' ? a : a.name;
      const nameB = typeof b === 'string' ? b : b.name;
      //lấy trạng thái online
      const isOnlineA = onlineStatus[nameA] === true;
      const isOnlineB = onlineStatus[nameB] === true;
      if (isOnlineA && !isOnlineB) return -1;
      if (!isOnlineA && isOnlineB) return 1;
      return 0;// cả hai cùng trạng thái giữ nguyên thứ tự
    });
  }, [conversations, onlineStatus]);

  return (
      <div className="conversations-list">
        <h3>Direct Messages</h3>
        <ul>
          // mỗi conversation là 1 ui
          {sortedConversations.map((conv, index) => {
            // chuẩn hóa tên
            const userName = typeof conv === 'string' ? conv : conv.name;
            const isSelected = selectedUser === userName;
            const isOnline = onlineStatus[userName] === true;

            // màu
            // Nếu Online: Màu Xanh Dương
            // Nếu Offline: Màu Xám nhạt
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
                      backgroundColor: avatarColor,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      transition: 'background-color 0.3s ease' // Hiệu ứng chuyển màu mượt mà
                    }}>
                      {userName.charAt(0).toUpperCase()} // Chữ cái đầu
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