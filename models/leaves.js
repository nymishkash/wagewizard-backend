const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Leave extends Model {}

  Leave.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      employeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Employees",
          key: "id",
        },
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('sick', 'casual'),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Leave",
      timestamps: true,
    }
  );

  return Leave;
};
