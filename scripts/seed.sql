-- =======================================================
-- DELIVERY MANAGEMENT SYSTEM - SAMPLE SEED DATA
-- =======================================================

USE `aspadmin`;

SET FOREIGN_KEY_CHECKS = 0;

-- Clean existing data
DELETE FROM `completed_deliveries`;
DELETE FROM `deliveries`;
DELETE FROM `order_items`;
DELETE FROM `orders`;
DELETE FROM `products`;
DELETE FROM `creditors`;
DELETE FROM `users`;

-- 1. Insert Users (Password is: password123)
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`) VALUES
(1, 'Rahil Thakur', 'rahil@alliedscientific.com', '$2a$10$l7uTuIgD.nD1DwguRFuBAeCCM0rSZ7IzQm52oW310R1UlyjzufTWe', 'admin'),
(2, 'Delivery Agent John', 'john@alliedscientific.com', '$2a$10$l7uTuIgD.nD1DwguRFuBAeCCM0rSZ7IzQm52oW310R1UlyjzufTWe', 'delivery_agent');

-- 2. Insert Creditors (Clients / Hospitals / Laboratories)
INSERT INTO `creditors` (`id`, `creditor_name`, `creditor_email_id`, `creditor_number_1`, `creditor_address_1`, `creditor_address_2`, `creditor_address_3`, `creditor_city`, `creditor_state`, `creditor_pincode`) VALUES
(1, 'Apollo Diagnostics Centre', 'deliveries.apollo@example.com', '+91 9876543210', 'Plot 42, Health City', 'Opposite Metro Pillar 12', 'Sector 5', 'Mumbai', 'Maharashtra', '400001'),
(2, 'City Life Pathology Lab', 'info.citypath@example.com', '+91 9811223344', '12/A, Commercial Complex', 'MG Road', 'Near Central Bank', 'Pune', 'Maharashtra', '411001');

-- 3. Insert Products
INSERT INTO `products` (`id`, `product_name`, `product_hs_code`, `product_uom`, `product_cat_no`) VALUES
(1, 'Disposable Sterile Syringes 5ml', '90183100', 'Box of 100', 'CAT-SYR-005'),
(2, 'Blood Collection Tubes EDTA 2ml', '90183900', 'Pack of 50', 'CAT-BCT-002'),
(3, 'Surgical Nitrile Examination Gloves (M)', '40151100', 'Box of 100', 'CAT-GLV-003'),
(4, 'Glass Microscopic Slides 75x25mm', '70179000', 'Pack of 72', 'CAT-SLD-004');

-- 4. Insert Orders
INSERT INTO `orders` (`id`, `order_number`, `creditor_id`, `status`, `created_by`) VALUES
(1, 'ORD-2026-001', 1, 'Open', 'Admin'),
(2, 'ORD-2026-002', 2, 'Open', 'Admin');

-- 5. Insert Order Items
INSERT INTO `order_items` (`order_id`, `product_id`, `item_quantity`) VALUES
(1, 1, 10),
(1, 2, 20),
(1, 3, 5),
(2, 3, 8),
(2, 4, 15);

-- 6. Insert Deliveries (Assigned to user 1 and user 2 with status 'raised')
INSERT INTO `deliveries` (`order_id`, `user_id`, `delivery_status`) VALUES
(1, 1, 'raised'),
(2, 1, 'raised');

SET FOREIGN_KEY_CHECKS = 1;
