-- dash_context Kong Plugin Schema
--
-- This plugin doesn't require any configuration, but we define the schema
-- for consistency and potential future extensions.

local typedefs = require "kong.db.schema.typedefs"

return {
  name = "dash_context",
  fields = {
    { consumer = typedefs.no_consumer },  -- This plugin doesn't target consumers
    { protocols = typedefs.protocols_http },
    { config = {
        type = "record",
        fields = {
          -- Optional: custom claim names (defaults are standard JWT claims)
          { tenant_id_claim = {
              type = "string",
              default = "tenant_id",
              description = "JWT claim name for tenant ID",
          }},
          { user_id_claim = {
              type = "string",
              default = "sub",
              description = "JWT claim name for user ID",
          }},
          { roles_claim = {
              type = "string",
              default = "roles",
              description = "JWT claim name for roles array",
          }},
          { learner_id_claim = {
              type = "string",
              default = "learner_id",
              description = "JWT claim name for learner ID (optional)",
          }},
          -- Header names to set
          { tenant_header = {
              type = "string",
              default = "X-Tenant-ID",
              description = "Header name for tenant ID",
          }},
          { user_header = {
              type = "string",
              default = "X-User-ID",
              description = "Header name for user ID",
          }},
          { roles_header = {
              type = "string",
              default = "X-Roles",
              description = "Header name for roles",
          }},
          { learner_header = {
              type = "string",
              default = "X-Learner-ID",
              description = "Header name for learner ID",
          }},
        },
      },
    },
  },
}
