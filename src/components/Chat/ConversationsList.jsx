import React from 'react';
import { extractName } from '../../utils/chatUtils';

function ConversationsList({ conversations, selectedUser, onSelectUser }) {
  return (
    <div className="conversations-list">
      {conversations.length === 0 ? (
        <p className="no-conversations">No conversations</p>
      ) : (
        conversations.map((person, index) => {
          const personName = extractName(person);
          const isActive = selectedUser === personName;
          return (
            <div
              key={index}
              className={`conversation-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectUser(person)}
            >
              <span className="user-avatar">👤</span>
              <p className="person-name">{personName}</p>
            </div>
          );
        })
      )}
    </div>
  );
}

export default ConversationsList;
