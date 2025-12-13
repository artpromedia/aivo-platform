-- dash_context Kong Plugin
--
-- Extracts JWT claims and injects context headers for downstream services:
--   X-Tenant-ID: tenant_id from JWT
--   X-User-ID: sub from JWT
--   X-Roles: comma-separated roles from JWT
--   X-Request-ID: correlation ID (if not already set)
--
-- This plugin runs AFTER the jwt plugin validates the token.

local DashContext = {
  PRIORITY = 900,  -- Run after jwt (1005) but before most other plugins
  VERSION = "1.0.0",
}

local kong = kong
local cjson = require "cjson.safe"
local ngx = ngx

-- Base64 URL decode (JWT uses URL-safe base64)
local function base64_url_decode(input)
  local remainder = #input % 4
  if remainder > 0 then
    local padding = string.rep("=", 4 - remainder)
    input = input .. padding
  end
  input = input:gsub("-", "+"):gsub("_", "/")
  return ngx.decode_base64(input)
end

-- Decode JWT payload (without validation - jwt plugin already validated)
local function decode_jwt_payload(token)
  if not token then
    return nil, "no token"
  end
  
  local parts = {}
  for part in token:gmatch("[^.]+") do
    table.insert(parts, part)
  end
  
  if #parts ~= 3 then
    return nil, "invalid token format"
  end
  
  local payload_json = base64_url_decode(parts[2])
  if not payload_json then
    return nil, "failed to decode payload"
  end
  
  local payload, err = cjson.decode(payload_json)
  if not payload then
    return nil, "failed to parse payload: " .. (err or "unknown error")
  end
  
  return payload
end

-- Extract bearer token from Authorization header
local function get_bearer_token()
  local auth_header = kong.request.get_header("Authorization")
  if not auth_header then
    return nil
  end
  
  local token = auth_header:match("^[Bb]earer%s+(.+)$")
  return token
end

-- Convert roles array to comma-separated string
local function roles_to_string(roles)
  if not roles then
    return ""
  end
  
  if type(roles) == "string" then
    return roles
  end
  
  if type(roles) == "table" then
    return table.concat(roles, ",")
  end
  
  return ""
end

function DashContext:access(conf)
  -- Get the JWT token
  local token = get_bearer_token()
  if not token then
    kong.log.debug("dash_context: no bearer token found")
    return
  end
  
  -- Decode the JWT payload
  local payload, err = decode_jwt_payload(token)
  if not payload then
    kong.log.warn("dash_context: failed to decode JWT: ", err)
    return
  end
  
  -- Extract claims
  local tenant_id = payload.tenant_id or payload.tenantId or payload.tid
  local user_id = payload.sub or payload.user_id or payload.userId
  local roles = payload.roles or payload.role
  local learner_id = payload.learner_id or payload.learnerId
  
  -- Set upstream headers
  if tenant_id then
    kong.service.request.set_header("X-Tenant-ID", tenant_id)
    kong.log.debug("dash_context: set X-Tenant-ID = ", tenant_id)
  else
    kong.log.warn("dash_context: no tenant_id found in JWT")
  end
  
  if user_id then
    kong.service.request.set_header("X-User-ID", user_id)
    kong.log.debug("dash_context: set X-User-ID = ", user_id)
  end
  
  if roles then
    local roles_str = roles_to_string(roles)
    kong.service.request.set_header("X-Roles", roles_str)
    kong.log.debug("dash_context: set X-Roles = ", roles_str)
  end
  
  if learner_id then
    kong.service.request.set_header("X-Learner-ID", learner_id)
    kong.log.debug("dash_context: set X-Learner-ID = ", learner_id)
  end
  
  -- Ensure request ID is set (correlation-id plugin should do this, but fallback)
  local request_id = kong.request.get_header("X-Request-ID")
  if not request_id then
    request_id = kong.request.get_header("X-Correlation-ID")
  end
  if request_id then
    kong.service.request.set_header("X-Request-ID", request_id)
  end
  
  -- Store context in kong.ctx.shared for other plugins
  kong.ctx.shared.dash_context = {
    tenant_id = tenant_id,
    user_id = user_id,
    roles = roles,
    learner_id = learner_id,
  }
end

return DashContext
