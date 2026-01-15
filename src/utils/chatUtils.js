export const parseConversationsFromResponse = (data) => {
    const people = [];
    const rooms = [];

    data.forEach(item => {
        if (typeof item === 'string') {
            if (item.includes('/')) {
                rooms.push({ name: item });
            } else {
                people.push(item);
            }
        } else if (typeof item === 'object') {
            const nm = item.name || item.user || item.to || item.value || '';
            const looksLikeRoom = (item.type === 1 || item.type === '1') || nm.includes('/');
            if (looksLikeRoom) rooms.push({ name: nm }); else people.push(nm || item);
        }
    });

    return { people, rooms };
};

export const parseMessagesFromResponse = (data) => {
    return Array.isArray(data) ? data : [];
};

export const normalizeForSearch = (str = '') => {
    return str
        .toString()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase();
};

export const filterConversations = (conversations, searchTerm) => {
    if (!searchTerm.trim()) return conversations;

    return conversations.filter(conv => {
        const convName = typeof conv === 'string' ? conv : conv.name || conv.to || '';
        return normalizeForSearch(convName).includes(normalizeForSearch(searchTerm));
    });
};

export const filterRooms = (rooms, searchTerm) => {
    if (!searchTerm.trim()) return rooms;

    return rooms.filter(room => {
        const roomName = typeof room === 'string' ? room : room.name || '';
        return normalizeForSearch(roomName).includes(normalizeForSearch(searchTerm));
    });
};

export const extractName = (item) => {
    if (typeof item === 'string') return item;
    return item.name || item.user || item.to || '';
};
