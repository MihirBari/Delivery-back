# Delivery Management System - Backend API

Robust, scalable, and modular Node.js/Express backend API for Allied Scientific Products delivery operations.

---

## 🚀 Key Improvements & Architecture Overhaul

1. **Modular MVC Architecture**:
   - Transitioned from a single monolithic file to clean separation of concerns:
     - `config/`: Database pooling, environment configs
     - `controllers/`: Request handling, validation, business logic
     - `routes/`: Express endpoint routing
     - `middleware/`: JWT verification, MySQL error handling
     - `services/`: Nodemailer email generation and dispatch
     - `scripts/`: SQL table creation DDL, seed data, and DB migration runner
     - `utils/`: Custom `ErrorHandler` class and `catchAsync` promise wrapper

2. **Upgraded to `mysql2/promise`**:
   - Replaced legacy callback-based `mysql` with modern `mysql2/promise`.
   - Native `async`/`await` support across all database operations.
   - True ACID transactions for delivery completion with automatic rollback on error and guaranteed connection release via `finally` blocks (preventing connection pool leaks).
   - Support for MySQL 8+ authentication plugins (`caching_sha2_password`).

3. **Fixed Critical SQL Bugs**:
   - Fixed missing commas and aliasing in `GET /orders/:userId` (`creditor_city creditor_state` had missing commas and prefixes).
   - Removed duplicate outer join on `order_items` in order listing to prevent duplicated order rows.
   - Sanitized parameterized queries with prepared statements to prevent SQL injection.

4. **Security Enhancements**:
   - Replaced hardcoded JWT secret with `process.env.JWT_SECRET`.
   - Added user metadata (`id`, `name`, `email`, `role`) to JWT token payload.
   - Dynamic CORS handling supporting local development (`localhost:3000`, `localhost:5173`) and production domains.
   - Fixed process listener typo from `unhandleRejection` to Node.js `unhandledRejection`.

5. **100% Frontend Compatibility**:
   - Preserved all response signatures expected by the React frontend (`res.data.data`, `res.status`, exact column names like `orderQuantity`, `Items`, `productName`, `HSNCODE`, `Test`, `Cat`).

---

## 🗄️ Database Re-creation (SQL DDL Queries)

If the database tables were deleted, you can recreate them using either of the two methods below.

### Method 1: Automated Script Runner

Make sure your database credentials in `config/.env` are correct, then run:

```bash
npm run init-db
```

This will automatically connect to MySQL, execute `scripts/schema.sql` to recreate all tables with foreign keys and indexes, and then insert sample seed data from `scripts/seed.sql`.

---

### Method 2: Manual SQL Execution (phpMyAdmin / MySQL Workbench)

Open `scripts/schema.sql` and run the queries against your database:

```sql
-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS `aspadmin` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `aspadmin`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users table
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

-- 2. Creditors (Customers / Clinics / Labs)
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

-- 3. Products
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

-- 4. Orders
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

-- 5. Order Items
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

-- 6. Deliveries (Task Assignments)
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

-- 7. Completed Deliveries (Audit Log)
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

-- 8. Sessions Table (for MySQL session storage)
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `session_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  `expires` INT(11) UNSIGNED NOT NULL,
  `data` MEDIUMTEXT COLLATE utf8mb4_bin,
  INDEX `idx_sessions_expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

SET FOREIGN_KEY_CHECKS = 1;
```

---

### Sample Test User (from `scripts/seed.sql`)
- **Email**: `rahil@alliedscientific.com`
- **Password**: `password123`

---

## 🛠️ Remote MySQL Access Note
If you encounter `Access denied for user 'rahilthakur'@'<IP>'`:
- Ensure that your MySQL user allows remote connections (`'rahilthakur'@'%'` or add your IP under cPanel > **Remote MySQL**).

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | API server health check and uptime status |
| `POST` | `/login` | Authenticate delivery agent / user and issue JWT cookie |
| `GET` | `/logout` | Log out user and clear auth cookie |
| `GET` | `/me` | Get current authenticated user profile |
| `GET` | `/orders/:userId` | Get list of assigned raised orders for delivery agent |
| `GET` | `/orderdetail/:id` | Get itemized products and quantities for an order |
| `PUT` | `/orders/:id` | Submit recipient signature and mark delivery as delivered |
| `POST` | `/send-email/:id` | Send delivery confirmation email to customer |
