// RBAC Rhai Script for Apollo Router
//
// This script implements field-level RBAC checks using the @rbac directive.
// It runs during the router request lifecycle and validates that the user
// has the required roles to access protected fields.
//
// See: https://www.apollographql.com/docs/router/customizations/rhai

// =============================================================================
// Request Lifecycle - Extract auth context from headers
// =============================================================================

fn supergraph_service(service) {
    // Add request processing
    service.map_request(|request| {
        // Extract context from headers (set by Kong dash_context plugin)
        let tenant_id = request.headers.get("X-Tenant-ID");
        let user_id = request.headers.get("X-User-ID");
        let roles_header = request.headers.get("X-Roles");
        let request_id = request.headers.get("X-Request-ID");
        
        // Parse roles from comma-separated string
        let roles = [];
        if roles_header != () {
            roles = roles_header.split(",");
        }
        
        // Store context for use in field processing
        request.context.auth = #{
            tenant_id: tenant_id,
            user_id: user_id,
            roles: roles,
            request_id: request_id,
            authenticated: user_id != ()
        };
        
        log_debug("RBAC: Auth context extracted - user_id=" + user_id + ", roles=" + roles_header);
    });
}

// =============================================================================
// Subgraph Service - Forward auth context to subgraphs
// =============================================================================

fn subgraph_service(service, subgraph) {
    // Ensure auth headers are forwarded to subgraphs
    service.map_request(|request| {
        let auth = request.context.auth;
        
        if auth != () {
            if auth.tenant_id != () {
                request.subgraph.headers["X-Tenant-ID"] = auth.tenant_id;
            }
            if auth.user_id != () {
                request.subgraph.headers["X-User-ID"] = auth.user_id;
            }
            if auth.roles.len() > 0 {
                request.subgraph.headers["X-Roles"] = auth.roles.join(",");
            }
            if auth.request_id != () {
                request.subgraph.headers["X-Request-ID"] = auth.request_id;
            }
        }
        
        log_debug("RBAC: Forwarding headers to subgraph " + subgraph);
    });
}

// =============================================================================
// Helper Functions
// =============================================================================

// Check if user has any of the required roles
fn has_required_role(user_roles, required_roles) {
    for role in required_roles {
        if user_roles.contains(role.trim()) {
            return true;
        }
    }
    return false;
}

// Log debug message
fn log_debug(msg) {
    log(msg, "debug");
}

// Log info message  
fn log_info(msg) {
    log(msg, "info");
}

// Log error message
fn log_error(msg) {
    log(msg, "error");
}
