-- Username + password accounts. Re-runs are safe: duplicate column/key errors are skipped by run.js.
ALTER TABLE users ADD COLUMN username VARCHAR(30) NULL AFTER full_name;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email_verified_at;
ALTER TABLE users ADD UNIQUE KEY uq_users_username (username);
ALTER TABLE otp_codes MODIFY purpose ENUM('login', 'verify', 'reset') NOT NULL DEFAULT 'login';
