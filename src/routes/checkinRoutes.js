const express = require("express");
const Joi = require("joi");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const { createCheckin, listCheckins } = require("../controllers/checkinController");

const router = express.Router();

const checkinSchema = Joi.object({
  date: Joi.string().optional(),
  moodScore: Joi.number().integer().min(1).max(5).required(),
  stressScore: Joi.number().integer().min(1).max(5).required(),
  anxietyScore: Joi.number().integer().min(1).max(5).required(),
  sleepScore: Joi.number().integer().min(1).max(5).required(),
  energyScore: Joi.number().integer().min(1).max(5).required(),
  physicalSymptoms: Joi.array().items(Joi.string()).default([]),
  notes: Joi.string().allow("").optional(),
});

router.post("/", auth, validate(checkinSchema), createCheckin);
router.get("/", auth, listCheckins);

module.exports = router;
