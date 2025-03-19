const { Op } = require("sequelize");
const { Employee, Leave } = require("../models");
const { v4: uuidv4, validate: validateUuid } = require("uuid");

async function getAllEmployees(args) {
  const { companyId } = args;
  // Format to UUID regardless of input format
  const formattedCompanyId = String(companyId);
  const employees = await Employee.findAll({ where: { companyId: formattedCompanyId } });
  return employees.map((emp) => emp.toJSON());
}

async function getEmployeeDetails(args) {
  const { employeeId } = args;
  // Format to UUID regardless of input format
  const formattedEmployeeId = String(employeeId);
  const employee = await Employee.findByPk(formattedEmployeeId);
  if (!employee) throw new Error("Employee not found");
  return employee.toJSON();
}

async function updateEmployee(args) {
  const { employeeId, updates } = args;
  // Format to UUID regardless of input format
  const formattedEmployeeId = String(employeeId);
  const employee = await Employee.findByPk(formattedEmployeeId);
  if (!employee) throw new Error("Employee not found");
  await employee.update(updates);
  return employee.toJSON();
}

async function getLeaveRecords(args) {
  const { employeeId } = args;
  // Format to UUID regardless of input format
  const formattedEmployeeId = String(employeeId);
  const leaves = await Leave.findAll({ where: { employeeId: formattedEmployeeId } });
  return leaves.map((leave) => leave.toJSON());
}

async function markLeave(args) {
  const { employeeId, date, type } = args;
  if (!employeeId || !date || !type) throw new Error("All fields are required");
  // Format to UUID regardless of input format
  const formattedEmployeeId = String(employeeId);
  const leave = await Leave.create({ employeeId: formattedEmployeeId, date, type });
  return leave.toJSON();
}

async function removeLeave(args) {
  const { employeeId, date } = args;
  // Format to UUID regardless of input format
  const formattedEmployeeId = String(employeeId);
  const leave = await Leave.findOne({ where: { employeeId: formattedEmployeeId, date } });
  if (!leave) throw new Error("No leave record found for this date");
  await leave.destroy();
  return { message: "Leave record removed successfully" };
}

async function getEmployeeAttendance(args) {
  const { employeeId, startDate, endDate } = args;
  // Format to UUID regardless of input format
  const formattedEmployeeId = String(employeeId);
  const leaves = await Leave.findAll({
    where: {
      employeeId: formattedEmployeeId,
      date: { [Op.between]: [startDate, endDate] },
    },
  });
  return leaves.map((leave) => leave.toJSON());
}

async function updateDesignation(args) {
  const { employeeId, newDesignation } = args;
  // Format to UUID regardless of input format
  const formattedEmployeeId = String(employeeId);
  const employee = await Employee.findByPk(formattedEmployeeId);
  if (!employee) throw new Error("Employee not found");
  await employee.update({ designation: newDesignation });
  return employee.toJSON();
}

async function adjustSalary(args) {
  const { employeeId, newBasePay, newOtherPay } = args;
  // Format to UUID regardless of input format
  const formattedEmployeeId = String(employeeId);
  const employee = await Employee.findByPk(formattedEmployeeId);
  if (!employee) throw new Error("Employee not found");
  await employee.update({ base_pay: newBasePay, other_pay: newOtherPay });
  return employee.toJSON();
}

async function searchEmployeesByName(args) {
  const { searchTerm } = args;

  if (!searchTerm || typeof searchTerm !== "string") {
    throw new Error("Search term is required and must be a string");
  }

  // Get all employees first
  const allEmployees = await Employee.findAll({
    attributes: ["id", "firstname", "lastname", "designation", "companyId"],
  });

  // Convert search term to lowercase for case-insensitive comparison
  const normalizedSearchTerm = searchTerm.toLowerCase();

  // Filter employees with various matching strategies
  const matchingEmployees = allEmployees.filter((employee) => {
    // Combine first and last name for full name search
    const employeeName = `${employee.firstname} ${employee.lastname}`.toLowerCase();

    // Direct substring match
    if (employeeName.includes(normalizedSearchTerm)) {
      return true;
    }

    // Also check first name and last name separately
    if (employee.firstname.toLowerCase().includes(normalizedSearchTerm) || 
        employee.lastname.toLowerCase().includes(normalizedSearchTerm)) {
      return true;
    }

    // Handle common character substitutions (like 'i' for 'ee', 'k' for 'c', etc.)
    const searchWithSubstitutions = normalizedSearchTerm
      .replace(/ee/g, "i")
      .replace(/i/g, "ee")
      .replace(/c/g, "k")
      .replace(/k/g, "c")
      .replace(/s/g, "sh")
      .replace(/sh/g, "s");

    if (employeeName.includes(searchWithSubstitutions)) {
      return true;
    }

    // Calculate Levenshtein distance for fuzzy matching
    // This helps match names with typos or slight variations
    const maxDistance = Math.max(2, Math.floor(normalizedSearchTerm.length / 3));
    const distance = levenshteinDistance(employeeName, normalizedSearchTerm);

    return distance <= maxDistance;
  });

  return matchingEmployees.map((employee) => employee.toJSON());
}

// Helper function to calculate Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;

  // Create a matrix of size (m+1) x (n+1)
  const dp = Array(m + 1)
    .fill()
    .map(() => Array(n + 1).fill(0));

  // Initialize the matrix
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

async function functionCalls(functionName, args) {
  if (functionName === "getAllEmployees") return await getAllEmployees(args[0]);
  else if (functionName === "getEmployeeDetails") return await getEmployeeDetails(args[0]);
  else if (functionName === "updateEmployee") return await updateEmployee(args[0]);
  else if (functionName === "getLeaveRecords") return await getLeaveRecords(args[0]);
  else if (functionName === "markLeave") return await markLeave(args[0]);
  else if (functionName === "removeLeave") return await removeLeave(args[0]);
  else if (functionName === "getEmployeeAttendance") return await getEmployeeAttendance(args[0]);
  else if (functionName === "updateDesignation") return await updateDesignation(args[0]);
  else if (functionName === "adjustSalary") return await adjustSalary(args[0]);
  else if (functionName === "searchEmployeesByName") return await searchEmployeesByName(args[0]);
  else throw new Error("Invalid function name");
}

module.exports = { functionCalls };
