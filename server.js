const express = require("express");
const ErrorHandler = require("./middleware/error");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mysql = require("mysql");
const bcrypt = require("bcryptjs"); // Import the bcryptjs library
const nodemailer = require("nodemailer")
const session = require('express-session');

app.use(express.json());
app.use(
  cors({
    origin: ['http://delivery.alliedscientificproducts.com'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Generate a salt
const saltRounds = 10; // Number of rounds to generate the salt (higher is more secure but slower)

//config
require("dotenv").config({
  path: "config/.env",
});

const server = app.listen(process.env.PORT, () => {
  console.log(`server is running on: ${process.env.PORT}`);
});

server.keepAliveTimeout = 3000;

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  },
}));

//unhandle promise rejection
process.on("unhandleRejection", (err) => {
  console.log(`Shutting down the server for ${err.message}`);
  console.log(`shutting down the server for unhandle promise rejection`);

  server.close(() => {
    process.exit(1);
  });
});

// Create a connection pool
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  debug: false,
});

app.post("/login", (req, res) => {
  // Create the SQL query
  const sql = "SELECT id, name, email, password FROM users WHERE email = ?";

  pool.query(sql, [req.body.email], (err, data) => {
    if (err) {
      console.log(err);
      return res.json(err);
    }
    if (data.length > 0) {
      bcrypt.compare(
        req.body.password.toString(),
        data[0].password,
        (err, response) => {
          if (err) return res.status(401).json({ err: "login error" });
          if (response) {
            const name = data[0].name;
            const expiresIn = req.body.rememberMe ? "30d" : "5d"; // Adjust the expiration based on Remember Me
            const token = jwt.sign({ name }, "jwt-secret-key", {
              expiresIn,
            });
            // Set the token as a cookie with an appropriate expiration
            res.cookie("token", token, { 
              httpOnly: true,
              maxAge: req.body.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 5 * 24 * 60 * 60 * 1000,
              sameSite: "Lax" 
            });

            return res.status(200).json({
              Status: "Success",
              data: data[0].id,
            });
          } else {
            console.log(err);
            return res.status(401).json(err);
          }
        }
      );
    } else {
      return res.status(401).json("no record");
    }
  });
});

//delivery orders
app.get("/orders/:userId", (req, res) => {
  // Create the SQL query
  const query = `
  SELECT  distinct (o.order_number) ,c.creditor_name, c.creditor_address_1 , c.creditor_address_2 ,c.creditor_address_3,creditor_city
  creditor_state,creditor_pincode , c.creditor_number_1 , o.id
  FROM deliveries d
  JOIN orders o  on o.id = d.order_id
  JOIN order_items oi on oi.order_id = o.id
  JOIN creditors c on c.id= o.creditor_id
  WHERE d.user_id = ? and d.delivery_status = 'raised'
`;

  pool.query(query, [req.params.userId], (err, data) => {
    if (err) {
      console.error("Error executing SQL query:", err);
      return;
    }
    // console.log(data)
    return res.status(200).json(data);
  });
});

//orderdetails
app.get("/orderdetail/:id", (req, res) => {
  const query = `
    SELECT o.*,oi.*,p.*
    FROM orders o
    JOIN order_items oi on oi.order_id = o.id
    JOIN products p on oi.product_id = p.id
    WHERE o.id = ?
  `;
  // Execute the query
  pool.query(query, [req.params.id], (error, results) => {
    if (error) {
      console.error("Error executing SQL query:", error);
      return;
    }
    // Process the results
    if (results.length == 1) {
      const order = results[0];
      console.log("Order Details:");
      const orderDetails = [
        {
          orderQuantity: order.item_quantity,
          Items: order.product_id,
          productName: order.product_name,
          HSNCODE: order.product_hs_code,
          Test: order.product_uom,
          Cat: order.product_cat_no,
        },
      ];
      console.log(orderDetails);
      return res.json(orderDetails);
    } else if (results.length > 1) {
      const orderDetails = [];
      results.forEach((order) => {
        const orderDetail = {
          orderQuantity: order.item_quantity,
          Items: order.product_id,
          productName: order.product_name,
          HSNCODE: order.product_hs_code,
          Test: order.product_uom,
          Cat: order.product_cat_no,
        };
        orderDetails.push(orderDetail);
      });
      return res.json(orderDetails);
    } else {
      return res.json("Order not found.");
    }
  });
});

app.put("/orders/:id", async (req, res) => {
  const query1 = `UPDATE deliveries d SET d.delivery_status = 'delivered' WHERE d.order_id = ?`;

  const query2 = `
  INSERT INTO completed_deliveries (order_id, recepient_name, recepient_contact, recepient_signature, created_by, delivery_time)
  SELECT
    o.id,
    c.creditor_name,
    c.creditor_number_1,
    ? as  recepient_signature,
    o.created_by,
    CURRENT_TIMESTAMP() as delivery_time
  FROM orders o
  JOIN creditors c ON o.creditor_id = c.id
  JOIN deliveries d ON d.order_id = o.id AND d.delivery_status = 'delivered'
  WHERE o.id = ?;
    `;

  const query3 = `
UPDATE orders
SET status='Closed' , recepient_signature = ?
WHERE id = ?`;

  const signatureDataURL = req.body.signature;
  const values = [req.params.id];
  const values1 = [signatureDataURL, req.params.id];

  pool.getConnection((error, connection) => {
    if (error) {
      throw error;
    }
    connection.beginTransaction((error) => {
      if (error) {
        connection.release();
        throw error;
      }
      connection.query(query1, values, (error, result1) => {
        if (error) {
          connection.rollback(() => {
            throw error;
          });
        }
        connection.query(query2, values1, (error, result2) => {
          if (error) {
            connection.rollback(() => {
              throw error;
            });
          }
          connection.query(query3, values1, (error, result3) => {
            if (error) {
              connection.rollback(() => {
                throw error;
              });
            }
            connection.commit((error) => {
              if (error) {
                connection.rollback(() => {
                  throw error;
                });
              }
              console.log("Transaction completed successfully!");
              connection.release();

              return res.json("Delivered the parcel");
            });
          });
        });
      });
    });
  });
});

// //Send the email
// app.get("/sendEmail/:id", (req, res) => {
//   const query = `
//   SELECT o.id, c.creditor_name, c.creditor_email_id,
//     oi.*, p.*
//     FROM orders o
//     JOIN creditors c ON o.creditor_id = c.id
//     JOIN deliveries d ON d.order_id = o.id 
//     JOIN order_items oi ON o.id = oi.order_id
//     JOIN products p ON oi.product_id = p.id
//     WHERE o.id = ?;
//   `;

//   pool.query(query, [req.params.id], async (err, results) => {
//     if (err) {
//       console.error('Error querying the database:', err);
//       return res.status(500).json({ error: 'An error occurred while querying the database.' });
//     }
//     if (!Array.isArray(results) || results.length === 0) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
//     const order = results[0];
//     const productList = results.map((result, index) => `
//     Product ${index + 1}:
//     - Order Quantity: ${result.item_quantity}
//     - Product ID: ${result.product_id}
//     - Product Name: ${result.product_name}
//     - HSNCODE: ${result.product_hs_code}
//     - Test: ${result.product_uom}
//     - Cat: ${result.product_cat_no}
//   `).join('\n\n');

//     try {
//       // Create a JSON object to send to the frontend
//       const response = {
//         productList: productList,
//         creditorEmailId: order.creditor_email_id,
//       };
//       console.log(response);
//       // Send the JSON response to the frontend
//       res.status(200).json(response);
//       console.log(response);
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'An error occurred while sending the email.' });
//     }
//   });
// })

//send email
// Configure nodemailer with your email service provider
const transporter = nodemailer.createTransport({
  host: process.env.SMPT_HOST,
      port: process.env.SMPT_PORT,
      service: process.env.SMPT_SERVICE,
      auth: {
        user: process.env.SMPT_MAIL,
        pass: process.env.SMPT_PASSWORD,
      },
});

// Define an endpoint to send the email
app.post('/send-email/:id', async (req, res) => {
  const query = `
    SELECT o.id, c.creditor_name, c.creditor_email_id,
    oi.*, p.*
    FROM orders o
    JOIN creditors c ON o.creditor_id = c.id
    JOIN deliveries d ON d.order_id = o.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.id = ?;
  `;

  pool.query(query, [req.params.id], async (err, results) => {
    if (err) {
      console.error('Error querying the database:', err);
      return res.status(500).json({ error: 'An error occurred while querying the database.' });
    }
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = results[0];
    // Create the email message
  const productList = results.map((result, index) => `
  Product ${index + 1}:
  - Order Quantity: ${result.item_quantity}
  - Product ID: ${result.product_id}
  - Product Name: ${result.product_name}
  - HSNCODE: ${result.product_hs_code}
  - Test: ${result.product_uom}
  - Cat: ${result.product_cat_no}
`).join('\n\n');

const mailOptions = {
  from: 'delivery.alliedscientific@gmail.com',
  to: order.creditor_email_id,
  cc: 'info@alliedscientific.net',
  subject: 'Your Delivered Products',
  text: `Thank you for your order ${order.creditor_name}. Here is the list of delivered products:
${productList}
`,
};

try{
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully!' });
    console.log("Email has been sent")
   }catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while sending the email.' });
    }
  });
});

//logout
app.get("/logout", (req, res) => {
  res.cookie("token");
  return res.json({
    status: "Success",
  });
});

//errorhandling
app.use(ErrorHandler);
