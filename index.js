require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jwt-simple");
const { createClient } = require("@libsql/client");

const app = express();
app.use(express.json());
app.use(require("cors")());

const db = createClient({
  url: process.env.DB_URI, // Turso Database URL
  authToken: process.env.DB_TOKEN, // Turso Database Token
});

const JWT_SECRET = process.env.JWT_SECRET;

// Create Users Table in Turso
async function loadConfigs() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      company TEXT NOT NULL
    )
  `);
}
loadConfigs();

app.post("/verifyToken", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "no token provided" });
  }

  try {
    const decoded = jwt.decode(token, process.env.JWT_SECRET);
    if (decoded) {
      return res.status(200).json({ success: true, message: "token successfully verified" });
    } else {
      return res.status(400).json({ success: false, error: "token invalid" });
    }
  } catch (error) {
    console.error("Invalid token:", error);
    return res.status(400).json({ success: false, error: "token verification failed" });
  }
});

// Register Route
app.post("/signup", async (req, res) => {
  const { name, email, password, company } = req.body;

  if (!name || !email || !password || !company) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID(); // Generate unique user ID

  try {
    await db.execute({
      sql: "INSERT INTO users (id, name, email, password, company) VALUES (?, ?, ?, ?, ?)",
      args: [userId, name, email, hashedPassword, company],
    });

    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ error: "Email already exists" });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.encode({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ token, user });
});

// Protected Route Example
app.get("/protected", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    res.json({ message: "Protected data", user: decoded });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Start Server
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
