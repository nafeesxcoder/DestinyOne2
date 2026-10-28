ALTER TABLE gift_orders MODIFY COLUMN status ENUM('recipient_pending','recipient_accepted','payment_authorized','merchant_preparing','courier_assigned','picked_up','delivered','cancelled','failed','refunded','expired') NOT NULL DEFAULT 'recipient_pending';
ALTER TABLE gift_orders ADD COLUMN paid_at DATETIME(6) NULL;
ALTER TABLE gift_orders ADD COLUMN delivered_at DATETIME(6) NULL;
ALTER TABLE gift_orders ADD COLUMN cancelled_reason VARCHAR(255) NULL;
ALTER TABLE gift_orders ADD COLUMN refund_id VARCHAR(255) NULL;
ALTER TABLE gift_orders ADD COLUMN provider VARCHAR(40) NULL;
ALTER TABLE gift_orders ADD COLUMN provider_order_id VARCHAR(255) NULL;
ALTER TABLE gift_orders ADD COLUMN tracking_url VARCHAR(500) NULL;
ALTER TABLE gift_orders ADD COLUMN address_purged_at DATETIME(6) NULL;
ALTER TABLE gift_orders ADD INDEX idx_gift_status_updated (status, updated_at);
ALTER TABLE gift_orders ADD INDEX idx_gift_payment_intent (stripe_payment_intent_id);
CREATE TABLE IF NOT EXISTS gift_order_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  status VARCHAR(40) NOT NULL,
  actor VARCHAR(40) NOT NULL,
  detail JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_gift_events_order (order_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
