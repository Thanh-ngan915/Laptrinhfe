import React, { useRef, useEffect, useMemo } from 'react';
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
    }, []); // <--- QUAN TRỌNG: Phải đóng ngoặc và có mảng rỗng []

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
    }, []); // Dependency rỗng là đúng

    const filteredConversations = filterConversations(conversations, searchTerm);
    const filteredRooms = filterRooms(rooms, searchTerm);

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
        dispatch(setNewMessage(''));
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
                    onTabChange={(t) => dispatch(setTab(t))}
                    conversations={filteredConversations}
                    selectedUser={selectedUser}
                    onSelectUser={(user) => dispatch(setSelectedUser(user))}
                    rooms={filteredRooms}
                    selectedRoom={selectedRoom}
                    onSelectRoom={(room) => dispatch(setSelectedRoom(room))}
                    searchTerm={searchTerm}
                    searchStatus={searchStatus}
                    onSearchTermChange={(val) => dispatch(setSearchTerm(val))}
                    onSearchSubmit={() => {}}
                    newRoomName={newRoomName}
                    onNewRoomNameChange={(val) => dispatch(setNewRoomName(val))}
                    onCreateRoom={handleCreateRoom}
                    roomCreateError={roomCreateError}
                    roomCreateSuccess={roomCreateSuccess}
                    onClearRoomMessages={() => dispatch(clearRoomCreateMessages())}
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