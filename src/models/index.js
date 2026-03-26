const sequelize = require("../config/db");
const User = require("./User");
const Checkin = require("./Checkin");
const ChatLog = require("./ChatLog");
const BookingRequest = require("./BookingRequest");

User.hasMany(Checkin, { foreignKey: "userId", onDelete: "CASCADE" });
Checkin.belongsTo(User, { foreignKey: "userId" });

User.hasMany(ChatLog, { foreignKey: "userId", onDelete: "CASCADE" });
ChatLog.belongsTo(User, { foreignKey: "userId" });

User.hasMany(BookingRequest, { foreignKey: "userId", onDelete: "CASCADE" });
BookingRequest.belongsTo(User, { foreignKey: "userId" });

module.exports = { sequelize, User, Checkin, ChatLog, BookingRequest };
