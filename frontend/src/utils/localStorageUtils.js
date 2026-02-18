/**
 * Local Storage Utilities for Chat Conversation Metadata
 * Stores conversation titles (friend names, group names) for instant UI rendering
 */

const STORAGE_KEY_PREFIX = 'chat_metadata_';
const STORAGE_VERSION = 'v1';

/**
 * Save conversation title to local storage
 * @param {string} conversationId - Conversation or group ID
 * @param {string} title - Display name (friend name or group name)
 * @param {string} type - 'direct' or 'group'
 */
export function saveConversationTitle(conversationId, title, type = 'direct') {
  try {
    const key = `${STORAGE_KEY_PREFIX}${conversationId}`;
    const data = {
      title,
      type,
      timestamp: Date.now(),
      version: STORAGE_VERSION
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save conversation title to localStorage:', error);
  }
}

/**
 * Get conversation title from local storage
 * @param {string} conversationId - Conversation or group ID
 * @returns {string|null} - Title or null if not found
 */
export function getConversationTitle(conversationId) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${conversationId}`;
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    
    // Check version compatibility
    if (parsed.version !== STORAGE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }
    
    // Check if data is older than 7 days (optional cache expiration)
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > SEVEN_DAYS) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.title;
  } catch (error) {
    console.warn('Failed to get conversation title from localStorage:', error);
    return null;
  }
}

/**
 * Get full conversation metadata from local storage
 * @param {string} conversationId - Conversation or group ID
 * @returns {object|null} - Metadata object or null if not found
 */
export function getConversationMetadata(conversationId) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${conversationId}`;
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    
    if (parsed.version !== STORAGE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.warn('Failed to get conversation metadata from localStorage:', error);
    return null;
  }
}

/**
 * Clear all conversation cache
 */
export function clearConversationCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear conversation cache:', error);
  }
}

/**
 * Get all cached conversations
 * @returns {Array} - Array of cached conversation metadata
 */
export function getAllCachedConversations() {
  try {
    const keys = Object.keys(localStorage);
    const conversations = [];
    
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.version === STORAGE_VERSION) {
              conversations.push({
                conversationId: key.replace(STORAGE_KEY_PREFIX, ''),
                ...parsed
              });
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      }
    });
    
    return conversations;
  } catch (error) {
    console.warn('Failed to get all cached conversations:', error);
    return [];
  }
}

/**
 * Remove a specific conversation from cache
 * @param {string} conversationId - Conversation or group ID
 */
export function removeConversationFromCache(conversationId) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${conversationId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove conversation from cache:', error);
  }
}
