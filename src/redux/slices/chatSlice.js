import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Connection state
  isConnected: false,
  isAuthenticated: false,
  
  // Chat data
  conversations: [],
  rooms: [],
  messages: [],
  joinedRooms: [],
  
  // Selection state
  selectedUser: null,
  selectedRoom: null,
  
  tab: 'messages',
  newMessage: '',
  newRoomName: '',
  searchTerm: '',
  
  roomCreateError: '',
  roomCreateSuccess: '',
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setIsConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    setIsAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action) => {
      if (!state.conversations.includes(action.payload)) {
        state.conversations.unshift(action.payload);
      }
    },
    
    setRooms: (state, action) => {
      state.rooms = action.payload;
    },
    addRoom: (state, action) => {
      const newRoomName = action.payload.name || action.payload;
      const exists = state.rooms.some(r => (r.name || r) === newRoomName);
      if (!exists) {
        state.rooms.push(action.payload);
      }
    },
    
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    
    setJoinedRooms: (state, action) => {
      state.joinedRooms = action.payload;
    },
    addJoinedRoom: (state, action) => {
      if (!state.joinedRooms.includes(action.payload)) {
        state.joinedRooms.push(action.payload);
      }
    },
    
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
      state.selectedRoom = null;
      state.messages = [];
      state.newMessage = '';
      state.roomCreateError = '';
      state.roomCreateSuccess = '';
    },
    setSelectedRoom: (state, action) => {
      state.selectedRoom = action.payload;
      state.selectedUser = null;
      state.messages = [];
      state.newMessage = '';
      state.roomCreateError = '';
      state.roomCreateSuccess = '';
    },
    clearSelection: (state) => {
      state.selectedUser = null;
      state.selectedRoom = null;
      state.messages = [];
    },
    
    setTab: (state, action) => {
      state.tab = action.payload;
    },
    setNewMessage: (state, action) => {
      state.newMessage = action.payload;
    },
    clearNewMessage: (state) => {
      state.newMessage = '';
    },
    setNewRoomName: (state, action) => {
      state.newRoomName = action.payload;
    },
    clearNewRoomName: (state) => {
      state.newRoomName = '';
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    clearSearchTerm: (state) => {
      state.searchTerm = '';
    },
    
    setRoomCreateError: (state, action) => {
      state.roomCreateError = action.payload;
    },
    setRoomCreateSuccess: (state, action) => {
      state.roomCreateSuccess = action.payload;
    },
    clearRoomCreateMessages: (state) => {
      state.roomCreateError = '';
      state.roomCreateSuccess = '';
    },
    
    resetChat: () => initialState,
  },
});

export const {
  setIsConnected,
  setIsAuthenticated,
  setConversations,
  addConversation,
  setRooms,
  addRoom,
  setMessages,
  addMessage,
  clearMessages,
  setJoinedRooms,
  addJoinedRoom,
  setSelectedUser,
  setSelectedRoom,
  clearSelection,
  setTab,
  setNewMessage,
  clearNewMessage,
  setNewRoomName,
  clearNewRoomName,
  setSearchTerm,
  clearSearchTerm,
  setRoomCreateError,
  setRoomCreateSuccess,
  clearRoomCreateMessages,
  resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;