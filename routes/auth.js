const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Company } = require("../models");
const company = require("../models/company");

router.post("/signup", async (req, res) => {
  const { name, email, password, company: companyName } = req.body;

  try {
    if (!name || !email || !password || !companyName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      company: companyName,
    });

    const company = await Company.create({
      name: companyName,
      userId: user.id,
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ error: "Email already exists" });
    }
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    const company = await Company.findOne({ where: { userId: user.id } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);

    res.json({ token, userId: user.id, companyId: company.id });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/verifyToken", (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(200).json({ message: "Token is valid" });
  });
});

module.exports = router;
