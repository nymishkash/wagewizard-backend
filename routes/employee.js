const express = require("express");
const router = express.Router();
const { Employee } = require("../models");
const { authenticateToken } = require("../middleware/auth");

/**
 * @route POST /api/employees/all
 * @desc Get all employees for a company with optional search
 * @access Private
 */
router.post("/all", authenticateToken, async (req, res) => {
  try {
    const { companyId, search } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    let employees;

    if (search && search.trim() !== "") {
      const searchTerm = search.toLowerCase();

      employees = await Employee.findAll({
        where: { companyId },
      });

      employees = employees.filter((employee) => {
        const fullName = `${employee.firstname} ${employee.lastname}`.toLowerCase();
        return (
          fullName.includes(searchTerm) ||
          employee.firstname.toLowerCase().includes(searchTerm) ||
          employee.lastname.toLowerCase().includes(searchTerm)
        );
      });
    } else {
      employees = await Employee.findAll({
        where: { companyId },
      });
    }

    employees.sort((a, b) => {
      const firstNameComparison = a.firstname.localeCompare(b.firstname);
      if (firstNameComparison === 0) {
        return a.lastname.localeCompare(b.lastname);
      }
      return firstNameComparison;
    });

    res.status(200).json({
      success: true,
      employees: employees.map((emp) => emp.toJSON()),
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route POST /api/employees/create
 * @desc Create a new employee
 * @access Private
 */
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const { firstname, lastname, designation, base_pay, other_pay, doj, companyId } = req.body;

    if (!firstname || !lastname || !designation || !companyId) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const newEmployee = await Employee.create({
      firstname,
      lastname,
      designation,
      base_pay: base_pay || 0,
      other_pay: other_pay || 0,
      doj: doj || new Date(),
      companyId,
    });

    res.status(201).json({
      success: true,
      employee: newEmployee.toJSON(),
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route POST /api/employees/update
 * @desc Update employee details
 * @access Private
 */
router.post("/update", authenticateToken, async (req, res) => {
  try {
    const { employeeId, firstname, lastname, designation, base_pay, other_pay, doj } = req.body;

    // Find the employee
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Update employee
    await employee.update({
      firstname: firstname || employee.firstname,
      lastname: lastname || employee.lastname,
      designation: designation || employee.designation,
      base_pay: base_pay !== undefined ? base_pay : employee.base_pay,
      other_pay: other_pay !== undefined ? other_pay : employee.other_pay,
      doj: doj || employee.doj,
    });

    res.status(200).json({
      success: true,
      employee: employee.toJSON(),
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route POST /api/employees/delete
 * @desc Delete an employee
 * @access Private
 */
router.post("/delete", authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.body;

    // Find the employee
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Delete employee
    await employee.destroy();

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @route GET /api/employees/:id
 * @desc Get employee details by ID
 * @access Private
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.params.id;

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      success: true,
      employee: employee.toJSON(),
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
