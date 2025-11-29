// src/config/constants.js

module.exports = {
  MODES: {
    NEW: 'new',
    ITERATE: 'iterate',
  },
  TOOLS: {
    CREATE_PAGE: 'createPage',
    CREATE_COMPONENT: 'createComponent',
    UPDATE_PAGE: 'updatePage',
    FIX_ERROR: 'fixError',
  },
  HISTORY_TYPES: {
    USER_INSTRUCTION: 'user_instruction',
    REASON: 'reason',
    ACT: 'act',
    OBSERVE: 'observe',
    COMPLETE: 'complete',
  },
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
  },
};
