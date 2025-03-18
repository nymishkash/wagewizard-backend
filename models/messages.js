const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Message extends Model {}

  Message.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Conversations",
          key: "id",
        },
      },
      chatText: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      chatUser: {
        type: DataTypes.ENUM("bot", "user"),
        allowNull: false,
      },
      meta: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Message",
      timestamps: true,
    }
  );

  return Message;
};
