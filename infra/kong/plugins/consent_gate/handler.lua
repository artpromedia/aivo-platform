-- consent_gate Kong Plugin
--
-- Verifies that the required consent has been granted before allowing
-- access to protected resources. Checks the consent-svc for the
-- learner's consent status.
--
-- Returns 451 (Unavailable For Legal Reasons) if consent is not granted.
-- This status code is appropriate for legally-required consent blocks.

local ConsentGate = {
  PRIORITY = 750,  -- Run after learner_scope (800)
  VERSION = "1.0.0",
}

local kong = kong
local http = require "resty.http"
local cjson = require "cjson.safe"

-- Cache for consent results
local consent_cache = ngx.shared.consent_gate_cache

-- Valid consent types (matches consent-svc ConsentType enum)
local VALID_CONSENT_TYPES = {
  BASELINE_ASSESSMENT = true,
  AI_TUTOR = true,
  RESEARCH_ANALYTICS = true,
}

-- Roles that can bypass consent checks (for administrative access)
local ADMIN_ROLES = {
  PLATFORM_ADMIN = true,
  SUPPORT = true,
  DISTRICT_ADMIN = true,
}

-- Extract learner ID from various sources
local function get_learner_id(ctx, request_body)
  -- First check dash_context
  if ctx and ctx.learner_id then
    return ctx.learner_id
  end
  
  -- Check URL path
  local path = kong.request.get_path()
  local learner_id = path:match("/learners/([%w%-]+)")
  if learner_id then
    return learner_id
  end
  
  -- Check query parameters
  learner_id = kong.request.get_query_arg("learnerId")
  if learner_id then
    return learner_id
  end
  
  -- Check request body (for POST requests)
  if request_body then
    local body = cjson.decode(request_body)
    if body and body.learnerId then
      return body.learnerId
    end
  end
  
  return nil
end

-- Check if user has admin role that bypasses consent check
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

-- Build cache key for consent status
local function build_cache_key(tenant_id, learner_id, consent_type)
  return string.format("consent:%s:%s:%s", tenant_id, learner_id, consent_type)
end

-- Check cache for consent status
local function check_cache(cache_key)
  if not consent_cache then
    return nil
  end
  
  local cached = consent_cache:get(cache_key)
  if cached then
    kong.log.debug("consent_gate: cache hit for ", cache_key)
    return cached == "granted"
  end
  
  return nil
end

-- Store consent status in cache
local function store_cache(cache_key, granted, ttl)
  if not consent_cache then
    return
  end
  
  local success, err = consent_cache:set(cache_key, granted and "granted" or "denied", ttl)
  if not success then
    kong.log.warn("consent_gate: failed to cache result: ", err)
  end
end

-- Call consent service to check consent status
local function check_consent_remote(conf, tenant_id, learner_id, consent_type, request_id)
  local httpc = http.new()
  httpc:set_timeout(conf.timeout or 5000)
  
  local url = string.format(
    "%s/consents/status?learnerId=%s&consentType=%s",
    conf.consent_service_url,
    learner_id,
    consent_type
  )
  
  local res, err = httpc:request_uri(url, {
    method = "GET",
    headers = {
      ["X-Tenant-ID"] = tenant_id,
      ["X-Request-ID"] = request_id or "",
      ["X-Internal-Service"] = "kong-gateway",
    },
  })
  
  if not res then
    kong.log.err("consent_gate: consent service request failed: ", err)
    return nil, "consent service unavailable"
  end
  
  if res.status == 200 then
    local response = cjson.decode(res.body)
    if response then
      -- Check if consent is GRANTED
      local status = response.status or response.consentStatus
      return status == "GRANTED", nil
    end
    return false, nil
  elseif res.status == 404 then
    -- No consent record found = not granted
    return false, nil
  else
    kong.log.err("consent_gate: consent service returned ", res.status)
    return nil, "consent service error"
  end
end

function ConsentGate:access(conf)
  -- Validate consent type configuration
  if not conf.required_consent_type then
    kong.log.err("consent_gate: required_consent_type not configured")
    return kong.response.exit(500, { error = "Internal configuration error" })
  end
  
  if not VALID_CONSENT_TYPES[conf.required_consent_type] then
    kong.log.err("consent_gate: invalid consent type: ", conf.required_consent_type)
    return kong.response.exit(500, { error = "Internal configuration error" })
  end
  
  -- Get dash_context data
  local ctx = kong.ctx.shared.dash_context
  if not ctx then
    kong.log.err("consent_gate: dash_context not available")
    return kong.response.exit(500, { error = "Internal configuration error" })
  end
  
  local tenant_id = ctx.tenant_id
  local roles = ctx.roles
  
  -- Validate required context
  if not tenant_id then
    kong.log.warn("consent_gate: missing tenant_id in context")
    return kong.response.exit(401, { error = "Unauthorized" })
  end
  
  -- Admin roles bypass consent check
  if is_admin(roles) then
    kong.log.debug("consent_gate: admin role detected, bypassing consent check")
    return
  end
  
  -- Get learner ID
  local request_body = kong.request.get_raw_body()
  local learner_id = get_learner_id(ctx, request_body)
  
  if not learner_id then
    -- No learner ID found - this might be a list request or other operation
    -- Check config to see if we should block or allow
    if conf.require_learner_id then
      kong.log.warn("consent_gate: learner ID required but not found")
      return kong.response.exit(400, {
        error = "Bad Request",
        message = "Learner ID is required for this operation",
      })
    else
      kong.log.debug("consent_gate: no learner ID, skipping consent check")
      return
    end
  end
  
  -- Check cache first
  local cache_key = build_cache_key(tenant_id, learner_id, conf.required_consent_type)
  local cached_result = check_cache(cache_key)
  
  if cached_result ~= nil then
    if cached_result then
      return  -- Consent granted from cache
    else
      kong.log.info("consent_gate: consent not granted (cached) for learner ", learner_id)
      return kong.response.exit(451, {
        error = "Unavailable For Legal Reasons",
        message = string.format(
          "Consent of type '%s' has not been granted for this learner",
          conf.required_consent_type
        ),
        consentType = conf.required_consent_type,
        learnerId = learner_id,
      })
    end
  end
  
  -- Call consent service to check status
  local request_id = kong.request.get_header("X-Request-ID")
  local granted, err = check_consent_remote(
    conf, tenant_id, learner_id, conf.required_consent_type, request_id
  )
  
  if err then
    -- On error, fail open or closed based on config
    if conf.fail_open then
      kong.log.warn("consent_gate: consent service error, failing open: ", err)
      return
    else
      kong.log.err("consent_gate: consent service error, failing closed: ", err)
      return kong.response.exit(503, { error = "Service unavailable" })
    end
  end
  
  -- Cache the result
  store_cache(cache_key, granted, conf.cache_ttl or 300)
  
  if not granted then
    kong.log.info("consent_gate: consent not granted for learner ", learner_id,
      " consent_type=", conf.required_consent_type)
    return kong.response.exit(451, {
      error = "Unavailable For Legal Reasons",
      message = string.format(
        "Consent of type '%s' has not been granted for this learner. " ..
        "Please contact the learner's parent/guardian to grant consent.",
        conf.required_consent_type
      ),
      consentType = conf.required_consent_type,
      learnerId = learner_id,
    })
  end
  
  kong.log.debug("consent_gate: consent granted for learner ", learner_id,
    " consent_type=", conf.required_consent_type)
end

return ConsentGate
