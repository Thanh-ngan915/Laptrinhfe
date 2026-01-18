import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import websocketService from '../services/websocketService';

import useWebSocket from '../hooks/useWebSocket';
import useAuth from '../hooks/useAuth';
import useRooms from '../hooks/useRooms';
import useMessages from '../hooks/useMessages';
import useConversations from '../hooks/useConversations';

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

import { filterConversations, filterRooms } from '../utils/chatUtils';
import ChatHeader from './Chat/ChatHeader';
import ChatSidebar from './Chat/ChatSidebar';
import ChatContent from './Chat/ChatContent';
import './Chat.css';

const uploadToCloudinary = async (file) => {
    const cloudName = "dqghfi8be";
    const uploadPreset = "appchat";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    let resourceType = "image";
    if (file.type.includes("video") || file.type.includes("audio")) {
        resourceType = "video";
    }

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
            { method: "POST", body: formData }
        );
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error("Lỗi upload:", error);
        return null;
    }
};

function Chat() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);

    const [searchStatus, setSearchStatus] = React.useState(null);
    const searchTimeoutRef = useRef(null);

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

    const currentUser = useMemo(() => {
        return JSON.parse(localStorage.getItem('currentUser') || '{}');
    }, []);

    useWebSocket();
    useAuth(currentUser);
    useConversations(isAuthenticated, currentUser);
    useRooms();
    useMessages();

    useEffect(() => {
        const handleOpen = () => {
            console.log("Status: Online");
            dispatch(setIsConnected(true));
        };

        const handleClose = () => {
            console.log("Status: Offline");
            dispatch(setIsConnected(false));
        };

        websocketService.on('OPEN', handleOpen);
        websocketService.on('CLOSE', handleClose);

        if (websocketService.ws?.readyState === WebSocket.OPEN) {
            dispatch(setIsConnected(true));
        }

        return () => {
            websocketService.off('OPEN', handleOpen);
            websocketService.off('CLOSE', handleClose);
        };
    }, [dispatch]);

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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!searchTerm || searchTerm.trim() === '') {
            setSearchStatus(null);
            return;
        }

        setSearchStatus('checking');

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            websocketService.send('CHECK_USER_EXIST', { user: searchTerm });
        }, 500);

        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchTerm]);

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

        websocketService.on('CHECK_USER_EXIST', handleCheckResult);

        return () => {
            websocketService.off('CHECK_USER_EXIST', handleCheckResult);
        };
    }, []);

    const filteredConversations = filterConversations(conversations, searchTerm);
    const filteredRooms = filterRooms(rooms, searchTerm);

    const handleRoomSearchSubmit = useCallback(() => {
        if (tab !== 'rooms') return;
        const roomName = (searchTerm || '').trim();
        if (!roomName) return;

        websocketService.send('JOIN_ROOM', { name: roomName });
        dispatch(setSelectedRoom({ name: roomName }));
        try { localStorage.setItem('selectedChat', JSON.stringify({ type: 'room', value: roomName })); } catch(e){}
    }, [tab, searchTerm, dispatch]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const matchedRoomName = (() => {
            if (selectedRoom) return (selectedRoom.name || selectedRoom || '').toString().trim();
            if (selectedUser) {
                const su = selectedUser.toString().trim();
                const found = rooms.find(r => (r?.name || r || '').toString().trim() === su);
                if (found) return (found.name || found || '').toString().trim();
            }
            return null;
        })();

        if (matchedRoomName) {
            websocketService.send('SEND_CHAT', {
                type: 'room',
                to: matchedRoomName,
                mes: newMessage,
            });

            const optimistic = {
                from: currentUser.name || currentUser.username || 'You',
                mes: newMessage,
                time: new Date().toLocaleTimeString(),
                to: matchedRoomName,
                type: 'room',
            };
            dispatch(addMessage(optimistic));
            dispatch(setNewMessage(''));
            return;
        }

        if (selectedUser) {
            websocketService.send('SEND_CHAT', {
                type: 'people',
                to: selectedUser,
                mes: newMessage,
            });

            const optimistic = {
                from: currentUser.name || currentUser.username || 'You',
                mes: newMessage,
                time: new Date().toLocaleTimeString(),
                to: selectedUser,
                type: 'people',
            };
            dispatch(addMessage(optimistic));
            dispatch(setNewMessage(''));
            return;
        }
    };
    const handleSendFile = async (file) => {
        if (!file) return;

        try {
            console.log("⏳ Đang upload lên Cloudinary...");
            // Gọi hàm upload thay vì nén ảnh
            const fileUrl = await uploadToCloudinary(file);

            if (!fileUrl) {
                alert("Upload thất bại!");
                return;
            }

            const matchedRoomName = (() => {
                if (selectedRoom) return (selectedRoom.name || selectedRoom || '').toString().trim();
                if (selectedUser) {
                    const su = selectedUser.toString().trim();
                    const found = rooms.find(r => (r?.name || r || '').toString().trim() === su);
                    if (found) return (found.name || found || '').toString().trim();
                }
                return null;
            })();

            const optimisticMsg = {
                from: currentUser.name || currentUser.username || 'You',
                mes: fileUrl, // <--- Giờ là URL chứ không phải Base64
                time: new Date().toLocaleTimeString(),
                to: matchedRoomName || selectedUser,
                type: matchedRoomName ? 'room' : 'people',
            };

            if (matchedRoomName) {
                websocketService.send('SEND_CHAT', {
                    type: 'room',
                    to: matchedRoomName,
                    mes: fileUrl,
                });
                dispatch(addMessage(optimisticMsg));
            } else if (selectedUser) {
                websocketService.send('SEND_CHAT', {
                    type: 'people',
                    to: selectedUser,
                    mes: fileUrl,
                });
                dispatch(addMessage(optimisticMsg));
            }

        } catch (error) {
            console.error("Lỗi gửi file:", error);
        }
    };

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;
        websocketService.send('CREATE_ROOM', { name: newRoomName });
        dispatch(setNewRoomName(''));
    };

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('selectedChat');
        websocketService.disconnect();
        navigate('/login');
    };

    const currentChatName = selectedUser || (selectedRoom ? (selectedRoom.name || selectedRoom) : null);

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
                        const roomName = room?.name || room;
                        // Gửi JOIN_ROOM mỗi khi chọn phòng để đảm bảo đã join và lấy chatData mới nhất
                        websocketService.send('JOIN_ROOM', { name: roomName });
                        dispatch(setSelectedRoom(room));
                        try { localStorage.setItem('selectedChat', JSON.stringify({ type: 'room', value: room })); } catch(e){}
                    }, [dispatch])}
                    searchTerm={searchTerm}
                    searchStatus={searchStatus}
                    onSearchTermChange={useCallback((val) => dispatch(setSearchTerm(val)), [dispatch])}
                    onSearchSubmit={handleRoomSearchSubmit}
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
                    onSendImage={handleSendFile}
                    tab={tab}
                    messagesEndRef={messagesEndRef}
                />
            </div>
        </div>
    );
}

export default Chat;
