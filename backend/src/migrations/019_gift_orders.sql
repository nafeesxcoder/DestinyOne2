CREATE TABLE IF NOT EXISTS gift_orders (
  id CHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(160) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  product_id VARCHAR(120) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  note TEXT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  total_cents INT NOT NULL,
  status ENUM('recipient_pending','recipient_accepted','payment_authorized','merchant_preparing','delivered','cancelled','failed') NOT NULL DEFAULT 'recipient_pending',
  delivery_address JSON NULL,
  stripe_checkout_session_id VARCHAR(255) NULL,
  stripe_payment_intent_id VARCHAR(255) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_gift_sender (sender_id),
  INDEX idx_gift_recipient (recipient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;