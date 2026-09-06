-- Soft delete (Instagram-style permanent delete with 30-day grace period)
ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL AFTER status;
