-- Name search: members can switch off being found by name, and name lookups use an index.
ALTER TABLE profiles
  ADD COLUMN searchable TINYINT(1) NOT NULL DEFAULT 1 AFTER verified,
  ADD INDEX idx_profiles_first_name (first_name);
