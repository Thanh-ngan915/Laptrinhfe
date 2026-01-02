import React from 'react';

function ChatHeader({ currentUser, isConnected, onLogout }) {
  return (
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
      <button onClick={onLogout} className="btn-logout">Logout</button>
    </div>
  );
}

export default ChatHeader;
