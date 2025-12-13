-- learner_scope Kong Plugin
--
-- Validates that the authenticated user has access to the requested learner data.
-- This plugin checks if the user has a valid relationship to the learner:
--   - Parent of the learner
--   - Teacher assigned to the learner's class
--   - Therapist assigned to the learner
--   - Platform admin (always allowed)
--
-- Returns 403 Forbidden if the user doesn't have access.

local LearnerScope = {
  PRIORITY = 800,  -- Run after dash_context (900) but before response
  VERSION = "1.0.0",
}

local kong = kong
local http = require "resty.http"
local cjson = require "cjson.safe"

-- Cache for authorization results
local auth_cache = ngx.shared.learner_scope_cache

-- Platform admin roles that bypass scope checks
local ADMIN_ROLES = {
  PLATFORM_ADMIN = true,
  SUPPORT = true,
}

-- Extract learner ID from URL path
-- Supports patterns like:
--   /api/v1/learners/:learnerId
--   /api/v1/learners/:learnerId/sessions
--   /api/v1/sessions/learner/:learnerId
local function extract_learner_id(path)
  -- Pattern 1: /learners/:id
  local learner_id = path:match("/learners/([%w%-]+)")
  if learner_id and learner_id ~= "" then
    return learner_id
  end
  
  -- Pattern 2: /learner/:id
  learner_id = path:match("/learner/([%w%-]+)")
  if learner_id and learner_id ~= "" then
    return learner_id
  end
  
  return nil
end

-- Check if user has admin role that bypasses scope check
local function is_admin(roles)
  if not roles then
    return false
  end
  
  if type(roles) == "string" then
    return ADMIN_ROLES[roles] == true
  end
  
  if type(roles) == "table" then
    for _, role in ipairs(roles) do
      if ADMIN_ROLES[role] then
        return true
      end
    end
  end
  
  return false
end

-- Build cache key for authorization result
local function build_cache_key(tenant_id, user_id, learner_id)
  return string.format("scope:%s:%s:%s", tenant_id, user_id, learner_id)
end

-- Check cache for previous authorization result
local function check_cache(cache_key, ttl)
  if not auth_cache then
    return nil
  end
  
  local cached = auth_cache:get(cache_key)
  if cached then
    kong.log.debug("learner_scope: cache hit for ", cache_key)
    return cached == "true"
  end
  
  return nil
end

-- Store authorization result in cache
local function store_cache(cache_key, authorized, ttl)
  if not auth_cache then
    return
  end
  
  local success, err = auth_cache:set(cache_key, authorized and "true" or "false", ttl)
  if not success then
    kong.log.warn("learner_scope: failed to cache result: ", err)
  end
end

-- Call auth service to verify learner scope
local function verify_scope_remote(conf, tenant_id, user_id, learner_id, request_id)
  local httpc = http.new()
  httpc:set_timeout(conf.timeout or 5000)
  
  local url = string.format(
    "%s/auth/scope/learner",
    conf.auth_service_url
  )
  
  local body = cjson.encode({
    tenantId = tenant_id,
    userId = user_id,
    learnerId = learner_id,
  })
  
  local res, err = httpc:request_uri(url, {
    method = "POST",
    body = body,
    headers = {
      ["Content-Type"] = "application/json",
      ["X-Request-ID"] = request_id or "",
      ["X-Internal-Service"] = "kong-gateway",
    },
  })
  
  if not res then
    kong.log.err("learner_scope: auth service request failed: ", err)
    return nil, "auth service unavailable"
  end
  
  if res.status == 200 then
    local response = cjson.decode(res.body)
    return response and response.authorized == true, nil
  elseif res.status == 403 then
    return false, nil
  else
    kong.log.err("learner_scope: auth service returned ", res.status)
    return nil, "auth service error"
  end
end

function LearnerScope:access(conf)
  -- Get dash_context data (set by dash_context plugin)
  local ctx = kong.ctx.shared.dash_context
  if not ctx then
    kong.log.err("learner_scope: dash_context not available, ensure dash_context plugin runs first")
    return kong.response.exit(500, { error = "Internal configuration error" })
  end
  
  local tenant_id = ctx.tenant_id
  local user_id = ctx.user_id
  local roles = ctx.roles
  
  -- Validate required context
  if not tenant_id or not user_id then
    kong.log.warn("learner_scope: missing tenant_id or user_id in context")
    return kong.response.exit(401, { error = "Unauthorized" })
  end
  
  -- Admin roles bypass scope check
  if is_admin(roles) then
    kong.log.debug("learner_scope: admin role detected, bypassing scope check")
    return
  end
  
  -- Extract learner ID from request path
  local path = kong.request.get_path()
  local learner_id = extract_learner_id(path)
  
  if not learner_id then
    -- No learner ID in path, nothing to check
    kong.log.debug("learner_scope: no learner ID in path, skipping scope check")
    return
  end
  
  -- If user's learner_id matches, they're accessing their own data
  if ctx.learner_id and ctx.learner_id == learner_id then
    kong.log.debug("learner_scope: user accessing own learner data")
    return
  end
  
  -- Check cache first
  local cache_key = build_cache_key(tenant_id, user_id, learner_id)
  local cached_result = check_cache(cache_key, conf.cache_ttl or 300)
  
  if cached_result ~= nil then
    if cached_result then
      return  -- Authorized from cache
    else
      kong.log.info("learner_scope: access denied (cached) for user ", user_id, " to learner ", learner_id)
      return kong.response.exit(403, {
        error = "Forbidden",
        message = "You do not have access to this learner's data",
      })
    end
  end
  
  -- Call auth service to verify scope
  local request_id = kong.request.get_header("X-Request-ID")
  local authorized, err = verify_scope_remote(conf, tenant_id, user_id, learner_id, request_id)
  
  if err then
    -- On error, fail open or closed based on config
    if conf.fail_open then
      kong.log.warn("learner_scope: auth service error, failing open: ", err)
      return
    else
      kong.log.err("learner_scope: auth service error, failing closed: ", err)
      return kong.response.exit(503, { error = "Service unavailable" })
    end
  end
  
  -- Cache the result
  store_cache(cache_key, authorized, conf.cache_ttl or 300)
  
  if not authorized then
    kong.log.info("learner_scope: access denied for user ", user_id, " to learner ", learner_id)
    return kong.response.exit(403, {
      error = "Forbidden",
      message = "You do not have access to this learner's data",
    })
  end
  
  kong.log.debug("learner_scope: access granted for user ", user_id, " to learner ", learner_id)
end

return LearnerScope
