const { Employee, Leave } = require("./models");

async function calculateMonthlyCompensation(args) {
  const { employeeId, month, year } = args;

  if (!employeeId || !month || !year) {
    throw new Error("Employee ID, month, and year are required");
  }

  const formattedEmployeeId = String(employeeId);

  const employee = await Employee.findByPk(formattedEmployeeId);
  if (!employee) throw new Error("Employee not found");

  // Calculate monthly rate from yearly compensation
  const monthlyBasePay = parseFloat(employee.base_pay) / 12;
  const monthlyOtherPay = parseFloat(employee.other_pay || 0) / 12;
  const monthlyTotalPay = monthlyBasePay + monthlyOtherPay;

  // Assuming 22 working days per month
  const dailyRate = monthlyTotalPay / 22;

  // Get month start and end dates in YYYY-MM-DD format
  const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${month.toString().padStart(2, "0")}-${lastDay}`;

  // Query for leaves in the specified month
  const leaves = await Leave.findAll({
    where: {
      employeeId: formattedEmployeeId,
      date: { [Op.between]: [startDate, endDate] },
    },
  });

  // Count leave types
  const casualLeaves = leaves.filter((leave) => leave.type === "casual").length;
  const sickLeaves = leaves.filter((leave) => leave.type === "sick").length;

  let deduction = 0;
  const maxCasualLeaves = 3;
  const maxSickLeaves = 3;

  if (casualLeaves > maxCasualLeaves) {
    deduction += dailyRate * (casualLeaves - maxCasualLeaves);
  }

  if (sickLeaves > maxSickLeaves) {
    deduction += dailyRate * (sickLeaves - maxSickLeaves);
  }

  const totalCompensation = monthlyTotalPay - deduction;

  return {
    employeeId: employee.id,
    name: `${employee.firstname} ${employee.lastname}`,
    month: month,
    year: year,
    basePay: parseFloat(monthlyBasePay.toFixed(2)),
    otherPay: parseFloat(monthlyOtherPay.toFixed(2)),
    casualLeaveCount: casualLeaves,
    sickLeaveCount: sickLeaves,
    deduction: parseFloat(deduction.toFixed(2)),
    totalCompensation: parseFloat(totalCompensation.toFixed(2)),
  };
}

// Example usage of calculateMonthlyCompensation function
const args = {
  employeeId: "6e6e4c68-899e-4d60-bfa3-707fd99274eb",
  month: 3,
  year: 2025,
};

calculateMonthlyCompensation(args)
  .then((result) => console.log(result))
  .catch((error) => console.error("Error calculating compensation:", error));
