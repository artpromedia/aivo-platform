-- learner_scope Kong Plugin Schema

local typedefs = require "kong.db.schema.typedefs"

return {
  name = "learner_scope",
  fields = {
    { consumer = typedefs.no_consumer },
    { protocols = typedefs.protocols_http },
    { config = {
        type = "record",
        fields = {
          -- Auth service URL for scope verification
          { auth_service_url = {
              type = "string",
              required = true,
              description = "URL of the auth service for scope verification",
          }},
          -- Request timeout in milliseconds
          { timeout = {
              type = "integer",
              default = 5000,
              description = "Timeout for auth service requests in milliseconds",
          }},
          -- Cache TTL for authorization results
          { cache_ttl = {
              type = "integer",
              default = 300,
              description = "TTL for cached authorization results in seconds",
          }},
          -- Fail open on auth service errors
          { fail_open = {
              type = "boolean",
              default = false,
              description = "If true, allow access when auth service is unavailable",
          }},
          -- Admin roles that bypass scope checks
          { admin_roles = {
              type = "array",
              elements = { type = "string" },
              default = { "PLATFORM_ADMIN", "SUPPORT" },
              description = "Roles that bypass learner scope checks",
          }},
        },
      },
    },
  },
}
