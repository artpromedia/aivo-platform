-- consent_gate Kong Plugin Schema

local typedefs = require "kong.db.schema.typedefs"

return {
  name = "consent_gate",
  fields = {
    { consumer = typedefs.no_consumer },
    { protocols = typedefs.protocols_http },
    { config = {
        type = "record",
        fields = {
          -- Consent service URL
          { consent_service_url = {
              type = "string",
              required = true,
              description = "URL of the consent service",
          }},
          -- Required consent type
          { required_consent_type = {
              type = "string",
              required = true,
              one_of = { "BASELINE_ASSESSMENT", "AI_TUTOR", "RESEARCH_ANALYTICS" },
              description = "The consent type required for this route",
          }},
          -- Request timeout in milliseconds
          { timeout = {
              type = "integer",
              default = 5000,
              description = "Timeout for consent service requests in milliseconds",
          }},
          -- Cache TTL for consent results
          { cache_ttl = {
              type = "integer",
              default = 300,
              description = "TTL for cached consent results in seconds",
          }},
          -- Whether learner ID is required
          { require_learner_id = {
              type = "boolean",
              default = true,
              description = "If true, return 400 if learner ID cannot be determined",
          }},
          -- Fail open on consent service errors
          { fail_open = {
              type = "boolean",
              default = false,
              description = "If true, allow access when consent service is unavailable",
          }},
          -- Admin roles that bypass consent checks
          { admin_roles = {
              type = "array",
              elements = { type = "string" },
              default = { "PLATFORM_ADMIN", "SUPPORT", "DISTRICT_ADMIN" },
              description = "Roles that bypass consent checks",
          }},
        },
      },
    },
  },
}
