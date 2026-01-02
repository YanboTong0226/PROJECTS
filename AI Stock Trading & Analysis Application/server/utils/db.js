const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  port: 3306,
  host: "localhost",
  user: "root",
  password: "1234",
  database: "Stock_analysis_system",
});

module.exports = { pool };
