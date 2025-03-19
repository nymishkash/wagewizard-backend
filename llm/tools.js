const tools = [
  {
    type: "function",
    function: {
      name: "getAllEmployees",
      description: "Fetch all employees for a given company.",
      parameters: {
        type: "object",
        properties: {
          companyId: { type: "string" },
        },
        required: ["companyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getEmployeeDetails",
      description: "Fetch details of a specific employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
        },
        required: ["employeeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateEmployee",
      description: "Update details of an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          updates: { type: "object" },
        },
        required: ["employeeId", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLeaveRecords",
      description: "Fetch all leave records of an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
        },
        required: ["employeeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "markLeave",
      description: "Mark a specific date as leave for an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          date: { type: "string", format: "date" },
          type: { type: "string" },
        },
        required: ["employeeId", "date", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "removeLeave",
      description: "Remove a leave record for an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          date: { type: "string", format: "date" },
        },
        required: ["employeeId", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getEmployeeAttendance",
      description: "Fetch attendance records of an employee within a date range.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" },
        },
        required: ["employeeId", "startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateDesignation",
      description: "Update the designation of an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          newDesignation: { type: "string" },
        },
        required: ["employeeId", "newDesignation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjustSalary",
      description: "Adjust the salary components of an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          newBasePay: { type: "number" },
          newOtherPay: { type: "number" },
        },
        required: ["employeeId", "newBasePay", "newOtherPay"],
      },
    },
  },
];

module.exports = { tools };
