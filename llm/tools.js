export default tools = [
  {
    type: "function",
    function: {
      name: "fetch_salary",
      description: "Retrieve the salary of an employee",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string", description: "The ID of the employee" },
        },
        required: ["employeeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_leave_balance",
      description: "Get the remaining leave balance of an employee",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string", description: "The ID of the employee" },
        },
        required: ["employeeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_employee_list",
      description: "Retrieve a list of all employees in the company",
      parameters: {
        type: "object",
        properties: {
          department: { type: "string", description: "Optional department filter" },
        },
        required: [],
      },
    },
  },
];
