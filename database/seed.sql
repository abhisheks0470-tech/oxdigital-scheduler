USE oxdigital_scheduler;

-- Password for all dummy users is 123456. The local Node API uses SHA-256 for the JSON datastore.
INSERT INTO users (id, name, mobile, email, password_hash, role, status, avatar) VALUES
('usr_admin', 'Abhishek Sir', '9000000001', 'admin@oxdigital.in', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'admin', 'active', 'AS'),
('usr_telecaller', 'Priya Sharma', '9000000002', 'telecaller@oxdigital.in', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'telecaller', 'active', 'PS'),
('usr_salesman', 'Rahul Kumar', '9000000003', 'salesman@oxdigital.in', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'salesman', 'active', 'RK'),
('usr_salesman2', 'Vikram Singh', '9000000004', 'vikram@oxdigital.in', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'salesman', 'active', 'VS');

INSERT INTO settings (setting_key, setting_value) VALUES
('company_profile', JSON_OBJECT('companyName', 'OxDigital', 'logo', '/assets/oxdigital-logo.svg')),
('working_hours', JSON_OBJECT('start', '09:00', 'end', '19:00')),
('meeting_buffer_minutes', JSON_EXTRACT('60', '$')),
('services', JSON_ARRAY('Google Ads','Facebook/Instagram Ads','Website Development','Social Media Management','Google Business Profile','Complete Digital Marketing')),
('payment_modes', JSON_ARRAY('Cash','UPI','Cheque','Bank Transfer'));
