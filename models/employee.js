const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Employee extends Model {}

  Employee.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      firstname: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastname: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      base_pay: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      other_pay: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      doj: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      designation: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Companies",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "Employee",
      timestamps: true,
    }
  );

  return Employee;
};
