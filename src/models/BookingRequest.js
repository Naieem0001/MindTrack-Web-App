const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BookingRequest = sequelize.define("BookingRequest", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  requestType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Counsellor",
  },
  location: { type: DataTypes.STRING, allowNull: false },
  preferredTime: { type: DataTypes.STRING, allowNull: true },
  message: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "requested" },
});

module.exports = BookingRequest;
