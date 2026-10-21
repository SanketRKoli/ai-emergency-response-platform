// An error that carries an HTTP status code and optional field errors.
export default class ApiError extends Error {
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
