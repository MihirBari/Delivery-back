-- =======================================================
-- DELIVERY MANAGEMENT SYSTEM - DATABASE CREATION SCHEMA
-- =======================================================

-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS `aspadmin` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `aspadmin`;

-- Disable foreign key checks during creation/recreation
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------
-- 1. Table: users
-- Holds delivery agents and administrative users
-- -------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'delivery_agent',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 2. Table: creditors (Customers / Client institutions)
-- Holds recipient customer and clinic / institute contact info
-- -------------------------------------------------------
DROP TABLE IF EXISTS `creditors`;
CREATE TABLE `creditors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `creditor_name` VARCHAR(150) NOT NULL,
  `creditor_email_id` VARCHAR(150) NULL,
  `creditor_number_1` VARCHAR(50) NULL,
  `creditor_address_1` VARCHAR(255) NULL,
  `creditor_address_2` VARCHAR(255) NULL,
  `creditor_address_3` VARCHAR(255) NULL,
  `creditor_city` VARCHAR(100) NULL,
  `creditor_state` VARCHAR(100) NULL,
  `creditor_pincode` VARCHAR(20) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_creditors_name` (`creditor_name`),
  INDEX `idx_creditors_email` (`creditor_email_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 3. Table: products (Scientific / Medical Products Catalog)
-- Holds inventory products, HSN codes, and catalog items
-- -------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_name` VARCHAR(255) NOT NULL,
  `product_hs_code` VARCHAR(50) NULL,
  `product_uom` VARCHAR(50) NULL,
  `product_cat_no` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_products_cat_no` (`product_cat_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 4. Table: orders
-- Holds sales orders placed by or dispatched to creditors
-- -------------------------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(100) NOT NULL UNIQUE,
  `creditor_id` INT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Open',
  `recepient_signature` LONGTEXT NULL,
  `created_by` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_orders_creditor_id` (`creditor_id`),
  INDEX `idx_orders_status` (`status`),
  CONSTRAINT `fk_orders_creditor` 
    FOREIGN KEY (`creditor_id`) REFERENCES `creditors` (`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 5. Table: order_items
-- Order line items linking orders with products & quantities
-- -------------------------------------------------------
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `item_quantity` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order_items_order_id` (`order_id`),
  INDEX `idx_order_items_product_id` (`product_id`),
  CONSTRAINT `fk_order_items_order` 
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_product` 
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 6. Table: deliveries
-- Delivery tasks assigned to users/drivers with status tracking
-- -------------------------------------------------------
DROP TABLE IF EXISTS `deliveries`;
CREATE TABLE `deliveries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `delivery_status` ENUM('raised', 'in_transit', 'delivered', 'cancelled') NOT NULL DEFAULT 'raised',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_deliveries_user_status` (`user_id`, `delivery_status`),
  INDEX `idx_deliveries_order_id` (`order_id`),
  CONSTRAINT `fk_deliveries_order` 
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_deliveries_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 7. Table: completed_deliveries
-- Audit records of successfully completed deliveries with recipient signature
-- -------------------------------------------------------
DROP TABLE IF EXISTS `completed_deliveries`;
CREATE TABLE `completed_deliveries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `recepient_name` VARCHAR(150) NULL,
  `recepient_contact` VARCHAR(50) NULL,
  `recepient_signature` LONGTEXT NULL,
  `created_by` VARCHAR(100) NULL,
  `delivery_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_completed_order_id` (`order_id`),
  CONSTRAINT `fk_completed_deliveries_order` 
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 8. Table: sessions (Optional: for express-mysql-session)
-- -------------------------------------------------------
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `session_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  `expires` INT(11) UNSIGNED NOT NULL,
  `data` MEDIUMTEXT COLLATE utf8mb4_bin,
  INDEX `idx_sessions_expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
