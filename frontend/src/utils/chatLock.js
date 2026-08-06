export const hashPassword = async (password) => {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getLockedChatsData = () => {
  try {
    const raw = localStorage.getItem('chatbox_locked_chats');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const defaultHash = localStorage.getItem('chatbox_chat_lock_hash') || localStorage.getItem('chatbox_app_lock_hash') || '';
      const map = {};
      parsed.forEach(k => { map[k] = defaultHash; });
      return map;
    }
    return parsed || {};
  } catch {
    return {};
  }
};

export const saveLockedChatsData = (data) => {
  localStorage.setItem('chatbox_locked_chats', JSON.stringify(data));
};

export const getLockedChatKeys = () => {
  return Object.keys(getLockedChatsData());
};

export const getChatPasscodeHash = (chatKey) => {
  const data = getLockedChatsData();
  return data[chatKey] || localStorage.getItem('chatbox_chat_lock_hash') || localStorage.getItem('chatbox_app_lock_hash') || null;
};

export const lockChatWithPasscode = (chatKey, passcodeHash) => {
  const data = getLockedChatsData();
  data[chatKey] = passcodeHash;
  saveLockedChatsData(data);
};

export const unlockAndRemoveChatLock = (chatKey) => {
  const data = getLockedChatsData();
  delete data[chatKey];
  saveLockedChatsData(data);
};

export const getChatKey = (chat) => {
  if (!chat) return '';
  return chat.isGroup ? `group_${chat.id}` : `conv_${chat.id}`;
};

export const isChatLocked = (chatKey) => {
  const data = getLockedChatsData();
  return data[chatKey] !== undefined;
};
