const { Op } = require("sequelize");
const { Employee, Leave } = require("../models");
const { v4: uuidv4, validate: validateUuid } = require("uuid");

async function getAllEmployees(args) {
  const { companyId } = args;
  // Format to UUID regardless of input format
  const formattedCompanyId = String(companyId);
  const employees = await Employee.findAll({ where: { companyId: formattedCompanyId } });
  return employees.map(emp => emp.toJSON());
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
  return leaves.map(leave => leave.toJSON());
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
  return leaves.map(leave => leave.toJSON());
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
  else throw new Error("Invalid function name");
}

module.exports = { functionCalls };
