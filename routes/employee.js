const express = require("express");
const router = express.Router();
const { User } = require("../models");

/**
 * @route POST /api/employee
 * @desc Create a new employee
 * @access Private
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      designation,
      department,
      basePay,
      otherPay,
      joiningDate,
      companyId,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !designation || !companyId) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Check if employee with email already exists
    const existingEmployee = await User.findOne({ where: { email } });
    if (existingEmployee) {
      return res.status(400).json({ message: "Employee with this email already exists" });
    }

    // Create new employee
    const newEmployee = await User.create({
      firstName,
      lastName,
      email,
      phone,
      designation,
      department,
      basePay: basePay || 0,
      otherPay: otherPay || 0,
      joiningDate: joiningDate || new Date(),
      companyId,
      role: "employee",
    });

    res.status(201).json({
      success: true,
      data: newEmployee,
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route PUT /api/employee/:id
 * @desc Update employee details
 * @access Private
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.params.id;
    const updates = req.body;

    // Find the employee
    const employee = await User.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if user has permission (admin or same company)
    if (req.user.role !== "admin" && req.user.companyId !== employee.companyId) {
      return res.status(403).json({ message: "Not authorized to update this employee" });
    }

    // Update employee
    await employee.update(updates);

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route GET /api/employee/:id
 * @desc Get employee details
 * @access Private
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.params.id;

    const employee = await User.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if user has permission
    if (req.user.role !== "admin" && req.user.companyId !== employee.companyId) {
      return res.status(403).json({ message: "Not authorized to view this employee" });
    }

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route GET /api/employee/company/:companyId
 * @desc Get all employees for a company
 * @access Private
 */
router.get("/company/:companyId", authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Check if user has permission
    if (req.user.role !== "admin" && req.user.companyId !== companyId) {
      return res.status(403).json({ message: "Not authorized to view these employees" });
    }

    const employees = await User.findAll({
      where: {
        companyId,
        role: "employee",
      },
    });

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
