// Checks req.body against a Zod schema.
// Bad input -> 400 with a list of { field, message }.
// Good input -> req.body is replaced with the cleaned (trimmed, lowercased) data.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
