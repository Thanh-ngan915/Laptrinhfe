import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import websocketService from '../services/websocketService';
import './Chat.css';

function Chat() {
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Tab state
    const [tab, setTab] = useState('messages');
    const [conversations, setConversations] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    // removed unused room-creation states (server doesn't support creating rooms)
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    /* eslint-disable-next-line no-unused-vars */
    const [joinedRooms, setJoinedRooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFallbackResults, setShowFallbackResults] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const setupWebSocket = async () => {
            try {
                await websocketService.connect();
                setIsConnected(true);

                // Khi nhận login thành công, yêu cầu danh sách people/rooms
                const onAuthSuccess = (data) => {
                    console.log('Login/RE_LOGIN response:', data);
                    if (data && (data.status === 'success' || data.event === 'RE_LOGIN' || data.status === 'ok')) {
                        setIsAuthenticated(true);
                        try {
                            websocketService.send('GET_PEOPLE_CHAT_MES', { name: currentUser.name || currentUser.user || currentUser.email, page: 1 });
                        } catch (err) {
                            console.warn('Không thể gửi GET_PEOPLE_CHAT_MES:', err);
                        }
                    } else {
                        console.warn('Auth response indicates failure:', data);
                    }
                };

                const onAuthError = (data) => {
                    console.log('Auth error response:', data);
                    if (data && data.status === 'error') {
                        console.warn('Auth failed:', data.mes);
                        if (data.event === 'RE_LOGIN') {
                            console.log('RE_LOGIN code expired or invalid, removing from localStorage');
                            const updatedUser = { ...currentUser, reLoginCode: null };
                            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        }
                    }
                };

                websocketService.on('RE_LOGIN', onAuthSuccess);
                websocketService.on('LOGIN', onAuthSuccess);
                websocketService.on('AUTH', onAuthError);

                // Always use LOGIN (not RE_LOGIN since code can expire); save code if server provides it
                if (currentUser && currentUser.password) {
                    websocketService.send('LOGIN', { user: currentUser.name || currentUser.user || currentUser.email, pass: currentUser.password });
                } else {
                    console.warn('No password found in currentUser; please login to server to fetch people/rooms');
                }

                websocketService.on('GET_PEOPLE_CHAT_MES', (data) => {
                    if (data.data && Array.isArray(data.data)) {
                        // If server returned empty result for the search, request full user list as fallback
                        if (data.data.length === 0) {
                            console.log('GET_PEOPLE_CHAT_MES returned empty — requesting GET_USER_LIST fallback');
                            try { websocketService.send('GET_USER_LIST', {}); } catch (e) { console.warn(e); }
                            return;
                        }

                        const people = [];
                        const roomsList = [];
                        
                        data.data.forEach(item => {
                            if (typeof item === 'string') {
                                // Simple string format
                                people.push(item);
                            } else if (typeof item === 'object' && item.name) {
                                // Object format with type field
                                if (item.type === 0 || item.type === '0') {
                                    // type: 0 = people (direct message)
                                    people.push(item.name || item.to || item);
                                } else if (item.type === 1 || item.type === '1') {
                                    // type: 1 = rooms
                                    roomsList.push(item);
                                } else {
                                    // If no type, default to people (fallback)
                                    people.push(item.name || item.to || item);
                                }
                            }
                        });

                        console.log('Parsed people:', people, 'Parsed rooms:', roomsList);
                        setConversations(people);
                        setRooms(roomsList);
                    }
                });

                // Fallback listener: GET_USER_LIST returns all users; populate conversations
                websocketService.on('GET_USER_LIST', (data) => {
                    try {
                        if (data.data && Array.isArray(data.data)) {
                            const people = data.data.map(u => (u.name || u.user || u));
                            console.log('GET_USER_LIST returned users:', people);
                            setConversations(people);
                            // show returned list even if it doesn't match current searchTerm
                            setShowFallbackResults(true);
                        }
                    } catch (e) { console.warn('GET_USER_LIST handler error', e); }
                });

                // Server uses GET_ROOM_CHAT_MES for returning room/person chat history
                websocketService.on('GET_ROOM_CHAT_MES', (data) => {
                    if (data.data && Array.isArray(data.data)) {
                        setMessages(data.data);
                    }
                });

                websocketService.on('SEND_CHAT', (data) => {
                    if (data.data) {
                        setMessages(prev => [...prev, data.data]);
                    }
                });

                websocketService.on('CREATE_ROOM', (data) => {
                    console.log('✓ Room creation response:', data);
                    if (data) {
                        let roomName = null;
                        if (data.data) {
                            roomName = typeof data.data === 'string' ? data.data : data.data.name || null;
                        } else if (typeof data === 'string') {
                            roomName = data;
                        }

                        if (roomName) {
                            setRooms(prev => [...prev, { name: roomName }]);
                            console.log('✓ Room added:', roomName);
                        } else {
                            console.log('CREATE_ROOM returned no room name');
                        }
                    }
                });

                // Update joinedRooms when server confirms JOIN_ROOM
                websocketService.on('JOIN_ROOM', (d) => {
                    try {
                        const name = d?.data?.name || d?.data || d?.room || null;
                        if (name) {
                            setJoinedRooms(prev => (prev.includes(name) ? prev : [...prev, name]));
                        }
                    } catch (e) { /* ignore */ }
                });

            } catch (error) {
                console.error('WebSocket error:', error);
            }
        };

        setupWebSocket();

        return () => {
            websocketService.disconnect();
        };
    }, []);

    const handleSelectUser = (person) => {
        const personName = typeof person === 'string' ? person : person.name || person.to || person;
        setSelectedUser(personName);
        setSelectedRoom(null);
        setMessages([]);
        
        websocketService.send('GET_ROOM_CHAT_MES', {
            name: personName,
            page: 1
        });
    };

    const handleSelectRoom = (room) => {
        setSelectedRoom(room);
        setSelectedUser(null);
        setMessages([]);
        
        websocketService.send('GET_ROOM_CHAT_MES', {
            name: room.name || room,
            page: 1
        });
    };

    // create-room UI removed (server doesn't support create action)

    const handleSendMessage = (e) => {
        e.preventDefault();
        
        if (newMessage.trim()) {
            if (selectedUser) {
                websocketService.send('SEND_CHAT', {
                    type: 'people',
                    to: selectedUser,
                    mes: newMessage
                });
            } else if (selectedRoom) {
                const roomName = selectedRoom.name || selectedRoom;
                // Ensure joined to room before sending (server may require join)
                if (!joinedRooms.includes(roomName)) {
                    websocketService.send('JOIN_ROOM', { name: roomName });
                    // optimistically mark joined; server will confirm via JOIN_ROOM response
                    setJoinedRooms(prev => (prev.includes(roomName) ? prev : [...prev, roomName]));
                }
                websocketService.send('SEND_CHAT', {
                    type: 'room',
                    to: roomName,
                    mes: newMessage
                });
            }
            setNewMessage('');
        }
    };

    const handleLogout = () => {
        websocketService.send('LOGOUT');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
        navigate('/login');
    };

    const handleSearchSubmit = () => {
        const name = searchTerm && searchTerm.trim();
        if (!name) return;
        // For messages tab we query server for people matching the name
        if (tab === 'messages') {
            websocketService.send('GET_PEOPLE_CHAT_MES', { name, page: 1 });
        }
    };

    const filteredConversations = showFallbackResults ? conversations : conversations.filter(conv => {
        const convName = typeof conv === 'string' ? conv : (conv.name || conv.to || '');
        const normalize = (s = '') => s.toString().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
        return normalize(convName).includes(normalize(searchTerm));
    });

    const filteredRooms = rooms.filter(room => {
        const roomName = typeof room === 'string' ? room : room.name || '';
        const normalize = (s = '') => s.toString().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
        return normalize(roomName).includes(normalize(searchTerm));
    });

    const currentChat = selectedUser || (selectedRoom?.name || selectedRoom);
    const isDirectMessage = selectedUser !== null;

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="header-content">
                    <h1>💬 Messaging</h1>
                    <div className="user-info">
                        <span className="user-name">{currentUser.name}</span>
                        <span className={`status ${isConnected ? 'online' : 'offline'}`}>
                            {isConnected ? '🟢 Online' : '🔴 Offline'}
                        </span>
                    </div>
                </div>
                <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>

            <div className="chat-main">
                <div className="chat-sidebar">
                    <div className="tabs">
                        <button
                            className={`tab ${tab === 'messages' ? 'active' : ''}`}
                            onClick={() => {
                                setTab('messages');
                                setSelectedRoom(null);
                                setSearchTerm('');
                            }}
                        >
                            💬 Messages
                        </button>
                        <button
                            className={`tab ${tab === 'rooms' ? 'active' : ''}`}
                            onClick={() => {
                                setTab('rooms');
                                setSelectedUser(null);
                                setSearchTerm('');

                                // If not authenticated, try LOGIN (not RE_LOGIN since code may be expired)
                                if (!isAuthenticated) {
                                    console.warn('Not authenticated yet — attempting LOGIN');
                                    if (currentUser && currentUser.password) {
                                        websocketService.send('LOGIN', { user: currentUser.name || currentUser.user || currentUser.email, pass: currentUser.password });
                                    } else {
                                        navigate('/login');
                                    }
                                } else {
                                    // already authenticated — refresh people/rooms if empty
                                    if (!conversations || conversations.length === 0) {
                                        websocketService.send('GET_PEOPLE_CHAT_MES', { name: currentUser.name || currentUser.user || currentUser.email, page: 1 });
                                    }
                                }
                            }}
                        >
                            🏠 Rooms
                        </button>
                    </div>

                    {tab === 'messages' && (
                        <>
                            <div className="search-box">
                                                        <input
                                                            type="text"
                                                            placeholder="Search people..."
                                                            value={searchTerm}
                                                            onChange={(e) => { setSearchTerm(e.target.value); setShowFallbackResults(false); }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchSubmit(); } }}
                                                            className="search-input"
                                                        />
                            </div>

                            <div className="conversations-list">
                                {filteredConversations.length === 0 ? (
                                    <p className="no-conversations">No conversations</p>
                                ) : (
                                    filteredConversations.map((person, index) => {
                                        const personName = typeof person === 'string' ? person : (person.name || person.to || person);
                                        const isActive = selectedUser === personName;
                                        return (
                                            <div
                                                key={index}
                                                className={`conversation-item ${isActive ? 'active' : ''}`}
                                                onClick={() => handleSelectUser(person)}
                                            >
                                                <span className="user-avatar">👤</span>
                                                <p className="person-name">{personName}</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}

                    {tab === 'rooms' && (
                        <>
                            <div className="search-box">
                                <input
                                    type="text"
                                    placeholder="Search rooms..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchSubmit(); } }}
                                    className="search-input"
                                />
                            </div>

                            <div className="rooms-list">
                                {filteredRooms.length === 0 ? (
                                    <p className="no-rooms">No rooms available</p>
                                ) : (
                                    filteredRooms.map((room, index) => (
                                        <div
                                            key={index}
                                            className={`room-item ${selectedRoom?.name === room.name ? 'active' : ''}`}
                                            onClick={() => handleSelectRoom(room)}
                                        >
                                            <span className="room-icon">🏠</span>
                                            <div className="room-info">
                                                <p className="room-name">{room.name || room}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="chat-content">
                    {currentChat ? (
                        <>
                            <div className="content-header">
                                <h2>{isDirectMessage ? `👤 ${currentChat}` : `🏠 ${currentChat}`}</h2>
                            </div>

                            <div className="messages-container">
                                {messages.length === 0 ? (
                                    <div className="no-messages">
                                        <p>Start conversation with {currentChat}</p>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => (
                                        <div
                                            key={index}
                                            className={`message ${msg.from === currentUser.name ? 'own' : 'other'}`}
                                        >
                                            <div className="message-bubble">
                                                <p className="message-from">{msg.from}</p>
                                                <p className="message-text">{msg.mes || msg}</p>
                                                <p className="message-time">
                                                    {msg.time || new Date().toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="message-input-form" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder="Type message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className="message-input"
                                />
                                <button type="submit" className="btn-send">
                                    📤 Send
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="no-room-selected">
                            <p>
                                {tab === 'messages'
                                    ? '👈 Select a person to start chat'
                                    : '👈 Select or create a room to start chat'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Chat;
