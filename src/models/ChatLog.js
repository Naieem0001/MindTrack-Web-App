const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ChatLog = sequelize.define("ChatLog", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userMessage: { type: DataTypes.TEXT, allowNull: false },
  assistantReply: { type: DataTypes.TEXT, allowNull: false },
  safetyFlag: { type: DataTypes.BOOLEAN, defaultValue: false },
});

module.exports = ChatLog;
