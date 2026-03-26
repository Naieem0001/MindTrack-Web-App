const { Sequelize } = require("sequelize");

const wantsSSL =
  String(process.env.DB_SSL || "").toLowerCase() === "true" ||
  String(process.env.DB_HOST || "").includes("rlwy.net");

const sequelize = new Sequelize(
  process.env.DB_NAME || "mental_hack",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    dialectOptions: wantsSSL
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : undefined,
    logging: false,
  }
);

module.exports = sequelize;
