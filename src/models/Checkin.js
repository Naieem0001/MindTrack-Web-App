const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Checkin = sequelize.define("Checkin", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  moodScore: { type: DataTypes.INTEGER, allowNull: false },
  stressScore: { type: DataTypes.INTEGER, allowNull: false },
  anxietyScore: { type: DataTypes.INTEGER, allowNull: false },
  sleepScore: { type: DataTypes.INTEGER, allowNull: false },
  energyScore: { type: DataTypes.INTEGER, allowNull: false },
  physicalSymptoms: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  dailyInsight: { type: DataTypes.TEXT, allowNull: true },
});

module.exports = Checkin;
