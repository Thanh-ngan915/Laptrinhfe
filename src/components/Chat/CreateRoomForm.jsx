import React, { useEffect } from 'react';

function CreateRoomForm({
  newRoomName,
  onNewRoomNameChange,
  onCreateRoom,
  roomCreateError,
  roomCreateSuccess,
  onClearMessages,
}) {
  useEffect(() => {
    // Auto-clear messages after 3 seconds
    if (roomCreateError || roomCreateSuccess) {
      const timer = setTimeout(() => {
        onClearMessages();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [roomCreateError, roomCreateSuccess, onClearMessages]);

  return (
    <div className="create-room-box">
      <form onSubmit={onCreateRoom} className="create-room-form">
        <input
          type="text"
          placeholder="New room name..."
          value={newRoomName}
          onChange={(e) => onNewRoomNameChange(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="btn-send">Create</button>
      </form>
      {roomCreateError && <p className="error-message">{roomCreateError}</p>}
      {roomCreateSuccess && <p className="success-message">{roomCreateSuccess}</p>}
    </div>
  );
}

export default CreateRoomForm;
