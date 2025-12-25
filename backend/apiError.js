function sendApiError(res, status, code, message, details = undefined, suggestion = undefined) {
  const payload = {
    error: message,
    code,
  };

  if (details !== undefined) payload.details = details;
  if (suggestion !== undefined) payload.suggestion = suggestion;

  return res.status(status).json(payload);
}

module.exports = {
  sendApiError,
};


