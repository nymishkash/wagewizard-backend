const tools = [
  {
    type: "function",
    function: {
      name: "fetch_salary",
      description: "Fetch salary details of an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
        },
        required: ["employeeId"],
      },
    },
  },
];

module.exports = tools;
