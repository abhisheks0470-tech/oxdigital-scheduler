CREATE DATABASE IF NOT EXISTS oxdigital_scheduler CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE oxdigital_scheduler;

CREATE TABLE users (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','telecaller','salesman') NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  avatar VARCHAR(8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE meetings (
  id VARCHAR(40) PRIMARY KEY,
  customer_name VARCHAR(160) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  whatsapp VARCHAR(20),
  business_name VARCHAR(160),
  business_category VARCHAR(120),
  address TEXT,
  map_location VARCHAR(255),
  interested_service VARCHAR(120),
  expected_budget DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  meeting_at DATETIME NOT NULL,
  blocked_start DATETIME NOT NULL,
  blocked_end DATETIME NOT NULL,
  telecaller_id VARCHAR(40) NOT NULL,
  salesman_id VARCHAR(40) NOT NULL,
  status ENUM('upcoming','completed','sale-done','follow-up','cancelled','not-interested','client-not-available','wrong-lead','need-revisit') NOT NULL DEFAULT 'upcoming',
  result_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_salesman_time (salesman_id, blocked_start, blocked_end),
  INDEX idx_telecaller (telecaller_id),
  INDEX idx_status (status),
  FOREIGN KEY (telecaller_id) REFERENCES users(id),
  FOREIGN KEY (salesman_id) REFERENCES users(id)
);

CREATE TABLE payment_proofs (
  id VARCHAR(40) PRIMARY KEY,
  meeting_id VARCHAR(40) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  payment_mode VARCHAR(40),
  upi_transaction_id VARCHAR(120),
  cheque_number VARCHAR(120),
  bank_reference VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE TABLE followups (
  id VARCHAR(40) PRIMARY KEY,
  meeting_id VARCHAR(40) NOT NULL,
  followup_at DATETIME NOT NULL,
  reason TEXT,
  expected_closing_amount DECIMAL(12,2) DEFAULT 0,
  reminder_status ENUM('pending','sent','missed') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id VARCHAR(40) PRIMARY KEY,
  user_id VARCHAR(40) NOT NULL,
  title VARCHAR(160) NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE salesman_locations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  salesman_id VARCHAR(40) NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  accuracy_meters DECIMAL(8,2),
  label VARCHAR(255),
  captured_at DATETIME NOT NULL,
  FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE meeting_checkins (
  id VARCHAR(40) PRIMARY KEY,
  meeting_id VARCHAR(40) NOT NULL,
  salesman_id VARCHAR(40) NOT NULL,
  checkin_at DATETIME,
  checkout_at DATETIME,
  start_latitude DECIMAL(10,7),
  start_longitude DECIMAL(10,7),
  end_latitude DECIMAL(10,7),
  end_longitude DECIMAL(10,7),
  is_near_customer BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value JSON NOT NULL
);
