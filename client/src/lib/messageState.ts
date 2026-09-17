/**
 * Merge a realtime message into inbox state without double-counting reconnects.
 *
 * @param {{messages: object[], unreadMessages: number}} state Current inbox state.
 * @param {object} message Incoming message.
 * @returns {{messages: object[], unreadMessages: number}}
 */
export function mergeReceivedMessage(state, message) {
  const exists = state.messages.some((row) => row._id === message._id);
  return {
    messages: [message, ...state.messages.filter((row) => row._id !== message._id)],
    unreadMessages: exists || message.readAt ? state.unreadMessages : state.unreadMessages + 1
  };
}

/**
 * Merge a read receipt and decrement the badge only when the local copy was unread.
 * This remains correct when the HTTP response and Socket.IO event arrive in either order.
 *
 * @param {{messages: object[], unreadMessages: number}} state Current inbox state.
 * @param {object} message Updated message carrying readAt.
 * @returns {{messages: object[], unreadMessages: number}}
 */
export function mergeReadMessage(state, message) {
  const previous = state.messages.find((row) => row._id === message._id);
  const wasUnread = Boolean(previous && !previous.readAt);
  return {
    messages: state.messages.map((row) => row._id === message._id ? message : row),
    unreadMessages: wasUnread ? Math.max(0, state.unreadMessages - 1) : state.unreadMessages
  };
}
