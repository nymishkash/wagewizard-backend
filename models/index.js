const { Sequelize } = require("sequelize");
const config = require("../config/database");
const UserModel = require("./user");
const LeaveModel = require("./leaves");
const MessageModel = require("./messages");
const ConversationModel = require("./conversations");
const CompanyModel = require("./company");
const EmployeeModel = require("./employee");

const env = process.env.NODE_ENV || "development";
const dbconfig = config[env];

const sequelize = new Sequelize(dbconfig.database, dbconfig.username, dbconfig.password, {
  host: dbconfig.host,
  dialect: dbconfig.dialect,
  port: dbconfig.port,
});

const User = UserModel(sequelize);
const Leave = LeaveModel(sequelize);
const Message = MessageModel(sequelize);
const Conversation = ConversationModel(sequelize);
const Company = CompanyModel(sequelize);
const Employee = EmployeeModel(sequelize);

const db = {
  sequelize,
  Sequelize,
  User,
  Leave,
  Message,
  Conversation,
  Company,
  Employee,
};

module.exports = db;
