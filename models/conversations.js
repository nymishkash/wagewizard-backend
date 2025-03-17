const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Conversation extends Model {}

  Conversation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Companies",
          key: "id",
        },
      },
      meta: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Conversation",
      timestamps: true,
    }
  );

  return Conversation;
};
