// src/utils/startConversation.js
// Call this from any profile card to open or create a 1:1 conversation.
// Usage: startConversation(myUid, theirUid, navigate)

export function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export function startConversation(myUid, theirUid, navigate) {
  if (!myUid || !theirUid || myUid === theirUid) return;
  const conversationId = getConversationId(myUid, theirUid);
  navigate(`/messages/${conversationId}`);
}
