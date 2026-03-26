module.exports = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (!error) return next();

  return res.status(400).json({
    message: "Validation failed",
    errors: error.details.map((d) => d.message),
  });
};
