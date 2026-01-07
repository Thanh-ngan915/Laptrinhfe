import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import websocketService from '../services/websocketService';

// --- 1. IMPORT CÁC HOOKS ---
import useWebSocket from '../hooks/useWebSocket';
import useAuth from '../hooks/useAuth';
import useRooms from '../hooks/useRooms';
import useMessages from '../hooks/useMessages';
import useConversations from '../hooks/useConversations';

// --- 2. IMPORT REDUX ACTIONS ---
import {
    setIsConnected,
    setTab,
    setNewMessage,
    setNewRoomName,
    setSearchTerm,
    setSelectedUser,
    setSelectedRoom,
    clearRoomCreateMessages,
} from '../redux/slices/chatSlice';
import { addMessage } from '../redux/slices/chatSlice';

// --- 3. IMPORT UTILS & COMPONENTS ---
import { filterConversations, filterRooms } from '../utils/chatUtils';
import ChatHeader from './Chat/ChatHeader';
import ChatSidebar from './Chat/ChatSidebar';
import ChatContent from './Chat/ChatContent';
import './Chat.css';

function Chat() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);

    const [searchStatus, setSearchStatus] = React.useState(null);
    // null: chưa tìm, 'checking': đang tìm, 'exist': có, 'not_found': không có
    const searchTimeoutRef = useRef(null);

    // --- 4. LẤY DATA TỪ REDUX ---
    const {
        isConnected,
        isAuthenticated,
        conversations,
        rooms,
        messages,
        selectedUser,
        selectedRoom,
        tab,
        newMessage,
        newRoomName,
        searchTerm,
        roomCreateError,
        roomCreateSuccess,
    } = useSelector(state => state.chat);

    // --- SỬA LỖI CÚ PHÁP TẠI ĐÂY ---
    // Bạn đã thiếu dấu }, [] ở đoạn trước
    const currentUser = useMemo(() => {
        return JSON.parse(localStorage.getItem('currentUser') || '{}');
    }, []); // <--- QUAN TRỌNG: Phải đóng ngoặc và có mảng rỗng []

    // --- 5. GỌI HOOKS (Phải nằm ngoài useMemo) ---
    useWebSocket();
    useAuth(currentUser);
    useConversations(isAuthenticated, currentUser);
    useRooms();
    useMessages();

    // --- 6. CÁC HÀM XỬ LÝ SỰ KIỆN ---
    useEffect(() => {
        const handleOpen = () => {
            console.log("Status: Online");
            dispatch(setIsConnected(true));
        };

        const handleClose = () => {
            console.log("Status: Offline");
            dispatch(setIsConnected(false));
        };

        // Đăng ký lắng nghe sự kiện OPEN/CLOSE từ Service
        websocketService.on('OPEN', handleOpen);
        websocketService.on('CLOSE', handleClose);

        // Kiểm tra ngay lập tức (đề phòng socket đã kết nối xong trước khi Chat mount)
        if (websocketService.ws?.readyState === WebSocket.OPEN) {
            dispatch(setIsConnected(true));
        }

        // Cleanup khi thoát
        return () => {
            websocketService.off('OPEN', handleOpen);
            websocketService.off('CLOSE', handleClose);
        };
    }, [dispatch]);

    // Khôi phục lựa chọn chat trước đó (nếu có) sau reload
    useEffect(() => {
        try {
            const stored = localStorage.getItem('selectedChat');
            if (stored) {
                const obj = JSON.parse(stored);
                if (obj?.type === 'user' && obj?.value) {
                    dispatch(setSelectedUser(obj.value));
                } else if (obj?.type === 'room' && obj?.value) {
                    dispatch(setSelectedRoom(obj.value));
                }
            }
        } catch (e) {
            console.warn('Không thể khôi phục selectedChat', e);
        }
    }, [dispatch]);

    // Tự động cuộn xuống tin nhắn mới
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 1. Logic Debounce & Gọi API khi gõ phím
    useEffect(() => {
        // Nếu ô tìm kiếm rỗng -> Reset trạng thái
        if (!searchTerm || searchTerm.trim() === '') {
            setSearchStatus(null);
            return;
        }

        // Đánh dấu là đang kiểm tra
        setSearchStatus('checking');

        // Xóa timeout cũ nếu người dùng gõ liên tục
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Đợi 500ms ngừng gõ mới gọi API
        searchTimeoutRef.current = setTimeout(() => {
            websocketService.send('CHECK_USER_EXIST', { user: searchTerm });
        }, 500);

        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchTerm]);

    // 2. Logic Nhận kết quả từ Server
    useEffect(() => {
        const handleCheckResult = (response) => {
            console.log("📨 Gói tin về:", response);

            if (response.status === 'success') {
                // Đảm bảo log này hiện ra
                console.log("⚡ Đang set state thành: exist");

                if (response.data && response.data.status === true) {
                    setSearchStatus(prev => 'exist'); // Dùng callback prev => ... để ép React re-render
                } else {
                    setSearchStatus(prev => 'not_found');
                }
            }
            else if (response.data && response.data.status === false) {
                setSearchStatus(prev => 'not_found');
            }
        };

        // Đăng ký sự kiện
        websocketService.on('CHECK_USER_EXIST', handleCheckResult);

        // Hủy đăng ký khi component bị hủy (Quan trọng để không bị lỗi khi Logout/Login)
        return () => {
            websocketService.off('CHECK_USER_EXIST', handleCheckResult);
        };
    }, []); // Dependency rỗng là đúng

    // Logic Search
    const filteredConversations = filterConversations(conversations, searchTerm);
    const filteredRooms = filterRooms(rooms, searchTerm);

    // Xử lý Gửi tin nhắn
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        if (selectedUser) {
            websocketService.send('SEND_CHAT', {
                type: 'people',
                to: selectedUser,
                mes: newMessage
            });
        } else if (selectedRoom) {
            const roomName = selectedRoom.name || selectedRoom;
            websocketService.send('SEND_CHAT', {
                type: 'room',
                to: roomName,
                mes: newMessage
            });
        }
        // Optimistically add the message locally so sender sees it immediately
        const optimistic = {
            from: currentUser.name || currentUser.username || 'You',
            mes: newMessage,
            time: new Date().toLocaleTimeString(),
            to: selectedUser || (selectedRoom ? (selectedRoom.name || selectedRoom) : null),
            type: selectedUser ? 'people' : 'room',
        };
        dispatch(addMessage(optimistic));
        dispatch(setNewMessage(''));
    };

    // Xử lý Tạo phòng
    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;
        websocketService.send('CREATE_ROOM', { name: newRoomName });
        dispatch(setNewRoomName(''));
    };

    // Xử lý Đăng xuất
    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('selectedChat');
        websocketService.disconnect();
        navigate('/login');
    };

    // Tên chat hiện tại để hiển thị tiêu đề
    const currentChatName = selectedUser || (selectedRoom ? (selectedRoom.name || selectedRoom) : null);

    // --- 7. RENDER GIAO DIỆN ---
    return (
        <div className="chat-container">
            <ChatHeader
                currentUser={currentUser}
                isConnected={isConnected}
                onLogout={handleLogout}
            />

            <div className="chat-main" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <ChatSidebar
                    tab={tab}
                    onTabChange={useCallback((t) => dispatch(setTab(t)), [dispatch])}
                    conversations={filteredConversations}
                    selectedUser={selectedUser}
                    onSelectUser={useCallback((user) => {
                        dispatch(setSelectedUser(user));
                        try { localStorage.setItem('selectedChat', JSON.stringify({ type: 'user', value: user })); } catch(e){}
                    }, [dispatch])}
                    rooms={filteredRooms}
                    selectedRoom={selectedRoom}
                    onSelectRoom={useCallback((room) => {
                        dispatch(setSelectedRoom(room));
                        try { localStorage.setItem('selectedChat', JSON.stringify({ type: 'room', value: room })); } catch(e){}
                    }, [dispatch])}
                    searchTerm={searchTerm}
                    searchStatus={searchStatus}
                    onSearchTermChange={useCallback((val) => dispatch(setSearchTerm(val)), [dispatch])}
                    onSearchSubmit={useCallback(() => {}, [])}
                    newRoomName={newRoomName}
                    onNewRoomNameChange={useCallback((val) => dispatch(setNewRoomName(val)), [dispatch])}
                    onCreateRoom={handleCreateRoom}
                    roomCreateError={roomCreateError}
                    roomCreateSuccess={roomCreateSuccess}
                    onClearRoomMessages={useCallback(() => dispatch(clearRoomCreateMessages()), [dispatch])}
                />

                <ChatContent
                    currentChat={currentChatName}
                    isDirectMessage={!!selectedUser}
                    messages={messages}
                    currentUser={currentUser}
                    newMessage={newMessage}
                    onNewMessageChange={(val) => dispatch(setNewMessage(val))}
                    onSendMessage={handleSendMessage}
                    tab={tab}
                    messagesEndRef={messagesEndRef}
                />
            </div>
        </div>
    );
}

export default Chat;