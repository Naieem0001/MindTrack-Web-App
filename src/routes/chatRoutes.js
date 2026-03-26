const express = require("express");
const Joi = require("joi");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { chat } = require("../controllers/chatController");

const router = express.Router();

const schema = Joi.object({
  message: Joi.string().min(2).max(2000).required(),
});

router.post("/", auth, validate(schema), chat);

module.exports = router;
