-- Mutual-match chats used to be stored under the RECIPIENT's user id, so the two
-- people in one chat wrote to two different keys. Move those rows to the shared
-- key "dm:<smaller id>:<larger id>". Only rows whose conversation_id is a user id
-- are touched (couple chats use a connection id), so re-running this is a no-op.
UPDATE chat_messages cm
  JOIN users u ON u.id = cm.conversation_id
  SET cm.conversation_id = CONCAT('dm:', LEAST(cm.sender_id, cm.conversation_id), ':', GREATEST(cm.sender_id, cm.conversation_id));

UPDATE date_proposals dp
  JOIN users u ON u.id = dp.conversation_id
  SET dp.conversation_id = CONCAT('dm:', LEAST(dp.proposer_id, dp.conversation_id), ':', GREATEST(dp.proposer_id, dp.conversation_id));

UPDATE live_locations ll
  JOIN users u ON u.id = ll.conversation_id
  SET ll.conversation_id = CONCAT('dm:', LEAST(ll.sharer_id, ll.conversation_id), ':', GREATEST(ll.sharer_id, ll.conversation_id));
