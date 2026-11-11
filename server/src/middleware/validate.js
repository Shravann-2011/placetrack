// Checks part of the request (body or query) against a Zod schema.
// Bad input  -> 400 with a list of { field, message }.
// Good input -> cleaned data is stored in req.validated[source]
//               (and also replaces req.body for body validation).
// Note: in Express 5, req.query is read-only, which is why we use req.validated.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.') || source,
          message: i.message,
        })),
      });
    }
    req.validated = { ...req.validated, [source]: result.data };
    if (source === 'body') req.body = result.data;
    next();
  };
}

module.exports = validate;
