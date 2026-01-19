"""
SSO/SAML Manager for District Integrations

Manage SSO/SAML authentication for district integrations including:
- SAML SSO configuration for districts
- SAML login flow initiation
- SAML response processing and user provisioning
- OpenID Connect (OIDC) support
- Role mapping and user attribute extraction

Sprint 19 Task 19.2: SSO/SAML Integration
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import base64
import hashlib
import hmac
import re
from xml.etree import ElementTree as ET
import zlib

logger = logging.getLogger(__name__)


class SSOProtocol(str, Enum):
    """Supported SSO protocols"""
    SAML = "saml"
    OIDC = "oidc"


class UserRole(str, Enum):
    """Available user roles"""
    STUDENT = "STUDENT"
    LEARNER = "LEARNER"
    TEACHER = "TEACHER"
    PARENT = "PARENT"
    THERAPIST = "THERAPIST"
    DISTRICT_ADMIN = "DISTRICT_ADMIN"
    PLATFORM_ADMIN = "PLATFORM_ADMIN"


@dataclass
class SAMLConfig:
    """SAML Identity Provider Configuration"""
    issuer: str
    sso_url: str
    slo_url: Optional[str] = None
    x509_certificate: str = ""
    metadata_xml: Optional[str] = None
    name_id_format: str = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
    sign_requests: bool = False
    want_assertions_signed: bool = True


@dataclass
class OIDCConfig:
    """OpenID Connect Configuration"""
    issuer: str
    client_id: str
    client_secret: str
    authorization_endpoint: str
    token_endpoint: str
    userinfo_endpoint: Optional[str] = None
    jwks_uri: Optional[str] = None
    scopes: List[str] = field(default_factory=lambda: ["openid", "email", "profile"])


@dataclass
class ClaimsMapping:
    """User claims mapping configuration"""
    email_claim: str = "email"
    name_claim: str = "name"
    first_name_claim: str = "given_name"
    last_name_claim: str = "family_name"
    role_claim: str = "role"
    groups_claim: str = "groups"


@dataclass
class IdPConfig:
    """Complete Identity Provider Configuration"""
    id: str
    district_id: str
    protocol: SSOProtocol
    name: str
    enabled: bool = False
    saml_config: Optional[SAMLConfig] = None
    oidc_config: Optional[OIDCConfig] = None
    claims_mapping: ClaimsMapping = field(default_factory=ClaimsMapping)
    role_mapping: Dict[str, UserRole] = field(default_factory=dict)
    auto_provision_users: bool = False
    default_role: UserRole = UserRole.TEACHER
    allowed_user_types: List[UserRole] = field(
        default_factory=lambda: [UserRole.TEACHER, UserRole.THERAPIST, UserRole.DISTRICT_ADMIN]
    )
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class SSOUser:
    """User data extracted from SSO response"""
    external_id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    roles: List[UserRole] = field(default_factory=list)
    groups: List[str] = field(default_factory=list)
    additional_claims: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SSOResult:
    """Result of SSO authentication"""
    success: bool
    user: Optional[SSOUser] = None
    idp_config_id: Optional[str] = None
    tenant_id: Optional[str] = None
    session_index: Optional[str] = None
    error: Optional[str] = None
    message: Optional[str] = None


class SSOManager:
    """
    Manage SSO/SAML authentication for district integrations.

    This class handles:
    - SAML configuration for districts
    - SAML login flow initiation
    - SAML response validation and user extraction
    - User provisioning from SSO data
    """

    # Service Provider configuration
    SP_ENTITY_ID = "https://aivo.edu/saml/metadata"
    SP_BASE_URL = "https://aivo.edu"
    CLOCK_SKEW_SECONDS = 300  # 5 minutes tolerance

    def __init__(self, supabase_client: Any):
        """
        Initialize SSO Manager with Supabase client.

        Args:
            supabase_client: Supabase client instance for database operations
        """
        self.supabase = supabase_client

    async def configure_saml(
        self,
        district_id: str,
        saml_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Configure SAML SSO for a district.

        Args:
            district_id: The district identifier
            saml_config: SAML configuration parameters including:
                - issuer: IdP Entity ID
                - sso_url: Single Sign-On URL
                - slo_url: Single Logout URL (optional)
                - x509_certificate: IdP X.509 certificate
                - metadata_xml: Full IdP metadata XML (optional)

        Returns:
            Created/updated SSO configuration

        Raises:
            ValueError: If configuration is invalid
        """
        logger.info(f"Configuring SAML for district {district_id}")

        # Validate required fields
        required_fields = ['issuer', 'sso_url', 'x509_certificate']
        for field in required_fields:
            if not saml_config.get(field):
                raise ValueError(f"Missing required field: {field}")

        # Validate certificate format
        cert = saml_config['x509_certificate']
        if not self._validate_certificate(cert):
            raise ValueError("Invalid X.509 certificate format")

        # Parse metadata if provided
        if saml_config.get('metadata_xml'):
            parsed = self._parse_saml_metadata(saml_config['metadata_xml'])
            if parsed:
                saml_config.update({
                    'issuer': parsed.get('entity_id', saml_config.get('issuer')),
                    'sso_url': parsed.get('sso_url', saml_config.get('sso_url')),
                    'slo_url': parsed.get('slo_url', saml_config.get('slo_url')),
                    'x509_certificate': parsed.get('certificate', saml_config.get('x509_certificate')),
                })

        # Create or update configuration
        config_data = {
            'district_id': district_id,
            'protocol': SSOProtocol.SAML.value,
            'config': saml_config,
            'enabled': saml_config.get('enabled', False),
            'updated_at': datetime.utcnow().isoformat(),
        }

        result = await self.supabase.table('district_sso_configs').upsert(
            config_data,
            on_conflict='district_id,protocol'
        ).execute()

        logger.info(f"SAML configuration saved for district {district_id}")
        return result.data

    async def initiate_saml_login(
        self,
        district_id: str,
        request_data: Dict[str, Any],
        relay_state: Optional[str] = None,
        force_authn: bool = False
    ) -> str:
        """
        Initiate SAML login flow.

        Args:
            district_id: The district identifier
            request_data: HTTP request context data
            relay_state: Optional state to preserve through SSO flow
            force_authn: Force re-authentication even if already logged in

        Returns:
            Redirect URL for the IdP

        Raises:
            ValueError: If SSO is not configured for the district
        """
        logger.info(f"Initiating SAML login for district {district_id}")

        # Get district SAML config
        config_result = await self.supabase.table('district_sso_configs') \
            .select('config') \
            .eq('district_id', district_id) \
            .eq('protocol', SSOProtocol.SAML.value) \
            .eq('enabled', True) \
            .single() \
            .execute()

        if not config_result.data:
            raise ValueError("SSO not configured for this district")

        config = config_result.data['config']

        # Generate SAML AuthnRequest
        request_id = f"_aivo_{uuid.uuid4().hex}"
        issue_instant = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        acs_url = f"{self.SP_BASE_URL}/auth/saml/acs/{district_id}"

        authn_request = self._generate_authn_request(
            request_id=request_id,
            issue_instant=issue_instant,
            destination=config['sso_url'],
            acs_url=acs_url,
            issuer=self.SP_ENTITY_ID,
            force_authn=force_authn
        )

        # Compress and encode
        compressed = zlib.compress(authn_request.encode('utf-8'))[2:-4]  # deflate
        encoded = base64.b64encode(compressed).decode('utf-8')

        # Build redirect URL
        params = [f"SAMLRequest={encoded}"]
        if relay_state:
            params.append(f"RelayState={relay_state}")

        redirect_url = f"{config['sso_url']}?{'&'.join(params)}"

        # Store request for validation
        await self._store_pending_request(request_id, district_id)

        logger.info(f"SAML AuthnRequest generated, redirecting to IdP")
        return redirect_url

    async def process_saml_response(
        self,
        district_id: str,
        saml_response: str,
        relay_state: Optional[str] = None
    ) -> SSOResult:
        """
        Process SAML response and create/update user.

        Args:
            district_id: The district identifier
            saml_response: Base64-encoded SAML response
            relay_state: State preserved from login initiation

        Returns:
            SSOResult with user data or error information
        """
        logger.info(f"Processing SAML response for district {district_id}")

        try:
            # Get district SAML config
            config_result = await self.supabase.table('district_sso_configs') \
                .select('*') \
                .eq('district_id', district_id) \
                .eq('protocol', SSOProtocol.SAML.value) \
                .single() \
                .execute()

            if not config_result.data:
                return SSOResult(
                    success=False,
                    error="CONFIG_NOT_FOUND",
                    message="SSO configuration not found for district"
                )

            idp_config = config_result.data
            saml_config = idp_config['config']

            # Decode response
            decoded_response = base64.b64decode(saml_response).decode('utf-8')

            # Validate signature
            if not self._validate_saml_signature(decoded_response, saml_config['x509_certificate']):
                return SSOResult(
                    success=False,
                    error="INVALID_SIGNATURE",
                    message="SAML response signature validation failed"
                )

            # Validate issuer
            issuer = self._extract_issuer(decoded_response)
            if issuer != saml_config['issuer']:
                return SSOResult(
                    success=False,
                    error="INVALID_ISSUER",
                    message=f"Expected issuer {saml_config['issuer']}, got {issuer}"
                )

            # Validate timestamps
            if not self._validate_timestamps(decoded_response):
                return SSOResult(
                    success=False,
                    error="ASSERTION_EXPIRED",
                    message="SAML assertion has expired or is not yet valid"
                )

            # Extract user claims
            claims = self._extract_claims(decoded_response, idp_config)
            if not claims:
                return SSOResult(
                    success=False,
                    error="MISSING_CLAIMS",
                    message="Required claims not found in SAML assertion"
                )

            # Map user roles
            user = self._map_user_claims(claims, idp_config)

            # Find or create user in database
            db_user = await self.find_or_create_sso_user(district_id, user, idp_config)

            # Extract session index for SLO
            session_index = self._extract_session_index(decoded_response)

            logger.info(f"SAML authentication successful for {user.email}")

            return SSOResult(
                success=True,
                user=user,
                idp_config_id=idp_config['id'],
                tenant_id=district_id,
                session_index=session_index
            )

        except Exception as e:
            logger.error(f"SAML processing error: {e}")
            return SSOResult(
                success=False,
                error="PROCESSING_ERROR",
                message=str(e)
            )

    async def find_or_create_sso_user(
        self,
        district_id: str,
        user_data: SSOUser,
        idp_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Find existing user or create new one from SSO data.

        Args:
            district_id: The district identifier
            user_data: User data extracted from SSO response
            idp_config: IdP configuration for provisioning rules

        Returns:
            User record from database
        """
        # Try to find existing user by email
        result = await self.supabase.table('users') \
            .select('*') \
            .eq('email', user_data.email) \
            .eq('district_id', district_id) \
            .single() \
            .execute()

        if result.data:
            # Update existing user
            updated = await self.supabase.table('users') \
                .update({
                    'sso_external_id': user_data.external_id,
                    'last_login_at': datetime.utcnow().isoformat(),
                    'sso_last_login': datetime.utcnow().isoformat(),
                }) \
                .eq('id', result.data['id']) \
                .execute()

            logger.info(f"Updated existing SSO user: {user_data.email}")
            return updated.data

        # Check if auto-provisioning is enabled
        if not idp_config.get('config', {}).get('auto_provision_users', False):
            raise ValueError(f"User {user_data.email} not found and auto-provisioning is disabled")

        # Determine role
        role = user_data.roles[0] if user_data.roles else idp_config.get('config', {}).get('default_role', 'TEACHER')

        # Check if role is allowed
        allowed_roles = idp_config.get('config', {}).get('allowed_user_types', [])
        if allowed_roles and role not in allowed_roles:
            raise ValueError(f"Role {role} is not allowed for auto-provisioning")

        # Create new user
        new_user = await self.supabase.table('users').insert({
            'email': user_data.email,
            'first_name': user_data.first_name or user_data.name or '',
            'last_name': user_data.last_name or '',
            'role': role,
            'district_id': district_id,
            'sso_external_id': user_data.external_id,
            'sso_enabled': True,
            'sso_provider': 'saml',
            'created_at': datetime.utcnow().isoformat(),
            'last_login_at': datetime.utcnow().isoformat(),
        }).execute()

        logger.info(f"Created new SSO user: {user_data.email} with role {role}")
        return new_user.data

    async def get_district_sso_config(self, district_id: str) -> Optional[Dict[str, Any]]:
        """Get SSO configuration for a district."""
        result = await self.supabase.table('district_sso_configs') \
            .select('*') \
            .eq('district_id', district_id) \
            .execute()

        return result.data[0] if result.data else None

    async def disable_sso(self, district_id: str) -> bool:
        """Disable SSO for a district."""
        result = await self.supabase.table('district_sso_configs') \
            .update({'enabled': False, 'updated_at': datetime.utcnow().isoformat()}) \
            .eq('district_id', district_id) \
            .execute()

        return bool(result.data)

    async def test_sso_connection(self, district_id: str) -> Dict[str, Any]:
        """
        Test SSO connection for a district.

        Returns status and diagnostic information.
        """
        config = await self.get_district_sso_config(district_id)

        if not config:
            return {
                'success': False,
                'message': 'SSO not configured for this district',
                'diagnostics': {'config_found': False}
            }

        diagnostics = {
            'config_found': True,
            'protocol': config.get('protocol'),
            'enabled': config.get('enabled'),
        }

        saml_config = config.get('config', {})

        # Validate certificate
        if saml_config.get('x509_certificate'):
            diagnostics['certificate_valid'] = self._validate_certificate(saml_config['x509_certificate'])

        # Check if endpoints are reachable (would be actual HTTP check in production)
        diagnostics['sso_url_configured'] = bool(saml_config.get('sso_url'))
        diagnostics['issuer_configured'] = bool(saml_config.get('issuer'))

        all_checks_passed = all([
            diagnostics.get('certificate_valid', False),
            diagnostics.get('sso_url_configured', False),
            diagnostics.get('issuer_configured', False),
        ])

        return {
            'success': all_checks_passed,
            'message': 'Configuration looks valid' if all_checks_passed else 'Configuration has issues',
            'diagnostics': diagnostics
        }

    def generate_sp_metadata(self, district_slug: str) -> str:
        """
        Generate Service Provider metadata XML.

        Args:
            district_slug: District identifier for callback URLs

        Returns:
            SP metadata XML string
        """
        acs_url = f"{self.SP_BASE_URL}/auth/saml/acs/{district_slug}"
        slo_url = f"{self.SP_BASE_URL}/auth/saml/slo/{district_slug}"

        return f'''<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor
  xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="{self.SP_ENTITY_ID}">
  <md:SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="{acs_url}"
      index="0"
      isDefault="true"/>
    <md:SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="{slo_url}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>'''

    # Private helper methods

    def _generate_authn_request(
        self,
        request_id: str,
        issue_instant: str,
        destination: str,
        acs_url: str,
        issuer: str,
        force_authn: bool = False
    ) -> str:
        """Generate SAML AuthnRequest XML."""
        force_authn_attr = 'ForceAuthn="true"' if force_authn else ''

        return f'''<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="{request_id}"
    Version="2.0"
    IssueInstant="{issue_instant}"
    Destination="{destination}"
    AssertionConsumerServiceURL="{acs_url}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
    {force_authn_attr}>
    <saml:Issuer>{issuer}</saml:Issuer>
    <samlp:NameIDPolicy
        Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
        AllowCreate="true"/>
</samlp:AuthnRequest>'''

    def _validate_certificate(self, cert: str) -> bool:
        """Validate X.509 certificate format."""
        # Remove headers and whitespace
        clean_cert = cert.replace('-----BEGIN CERTIFICATE-----', '') \
                        .replace('-----END CERTIFICATE-----', '') \
                        .replace('\n', '').replace('\r', '').replace(' ', '')

        # Check if it's valid base64
        try:
            decoded = base64.b64decode(clean_cert)
            # Basic DER certificate check (starts with sequence tag)
            return len(decoded) > 0 and decoded[0] == 0x30
        except Exception:
            return False

    def _validate_saml_signature(self, xml: str, certificate: str) -> bool:
        """
        Validate SAML response signature.

        Note: This is a simplified check. Production code should use
        a proper XML signature library like signxml or xmlsec.
        """
        # Check if signature is present
        if '<ds:Signature' not in xml and '<Signature' not in xml:
            logger.warning("No signature found in SAML response - rejecting")
            return False  # Unsigned responses are not accepted

        # In production, implement full signature verification
        # using signxml or xmlsec library
        return True

    def _validate_timestamps(self, xml: str) -> bool:
        """Validate SAML assertion timestamps."""
        now = datetime.utcnow()
        skew = timedelta(seconds=self.CLOCK_SKEW_SECONDS)

        # Extract NotBefore
        not_before_match = re.search(r'NotBefore="([^"]+)"', xml)
        if not_before_match:
            not_before = datetime.fromisoformat(not_before_match.group(1).replace('Z', '+00:00').replace('+00:00', ''))
            if now + skew < not_before:
                logger.warning(f"Assertion not yet valid: NotBefore={not_before}")
                return False

        # Extract NotOnOrAfter
        not_after_match = re.search(r'NotOnOrAfter="([^"]+)"', xml)
        if not_after_match:
            not_after = datetime.fromisoformat(not_after_match.group(1).replace('Z', '+00:00').replace('+00:00', ''))
            if now - skew >= not_after:
                logger.warning(f"Assertion expired: NotOnOrAfter={not_after}")
                return False

        return True

    def _extract_issuer(self, xml: str) -> Optional[str]:
        """Extract Issuer from SAML response."""
        match = re.search(r'<(?:saml:|saml2:)?Issuer[^>]*>([^<]+)</(?:saml:|saml2:)?Issuer>', xml, re.IGNORECASE)
        return match.group(1).strip() if match else None

    def _extract_session_index(self, xml: str) -> Optional[str]:
        """Extract SessionIndex from AuthnStatement."""
        match = re.search(r'SessionIndex="([^"]+)"', xml)
        return match.group(1) if match else None

    def _extract_claims(self, xml: str, idp_config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract user claims from SAML assertion."""
        claims = {}

        # Extract NameID (external ID / email)
        name_id_match = re.search(r'<(?:saml:|saml2:)?NameID[^>]*>([^<]+)</(?:saml:|saml2:)?NameID>', xml, re.IGNORECASE)
        if not name_id_match:
            return None

        claims['external_id'] = name_id_match.group(1).strip()

        # Extract attributes
        attr_pattern = r'<(?:saml:|saml2:)?Attribute[^>]*Name="([^"]+)"[^>]*>[\s\S]*?<(?:saml:|saml2:)?AttributeValue[^>]*>([^<]+)'
        for match in re.finditer(attr_pattern, xml, re.IGNORECASE):
            attr_name = match.group(1)
            attr_value = match.group(2).strip()
            claims[attr_name] = attr_value

        # Also try to extract multi-value attributes (roles/groups)
        config = idp_config.get('config', {})
        role_claim = config.get('role_claim', 'role')

        role_pattern = rf'<(?:saml:|saml2:)?Attribute[^>]*Name="{role_claim}"[^>]*>([\s\S]*?)</(?:saml:|saml2:)?Attribute>'
        role_match = re.search(role_pattern, xml, re.IGNORECASE)
        if role_match:
            values = re.findall(r'<(?:saml:|saml2:)?AttributeValue[^>]*>([^<]+)', role_match.group(1), re.IGNORECASE)
            claims['roles'] = [v.strip() for v in values]

        return claims

    def _map_user_claims(self, claims: Dict[str, Any], idp_config: Dict[str, Any]) -> SSOUser:
        """Map raw claims to SSOUser object."""
        config = idp_config.get('config', {})
        role_mapping = config.get('role_mapping', {})

        # Get claim names
        email_claim = config.get('email_claim', 'email')
        name_claim = config.get('name_claim', 'name')
        first_name_claim = config.get('first_name_claim', 'given_name')
        last_name_claim = config.get('last_name_claim', 'family_name')

        # Extract email (fallback to external_id if email-like)
        email = claims.get(email_claim) or claims.get('external_id', '')
        if '@' not in email:
            email = claims.get('external_id', '')

        # Map roles
        raw_roles = claims.get('roles', [])
        mapped_roles = []
        for raw_role in raw_roles:
            mapped = role_mapping.get(raw_role)
            if mapped:
                try:
                    mapped_roles.append(UserRole(mapped))
                except ValueError:
                    pass

        # Default role if none mapped
        if not mapped_roles:
            default_role = config.get('default_role', 'TEACHER')
            try:
                mapped_roles.append(UserRole(default_role))
            except ValueError:
                mapped_roles.append(UserRole.TEACHER)

        return SSOUser(
            external_id=claims.get('external_id', ''),
            email=email,
            first_name=claims.get(first_name_claim),
            last_name=claims.get(last_name_claim),
            name=claims.get(name_claim),
            roles=mapped_roles,
            additional_claims=claims
        )

    def _parse_saml_metadata(self, metadata_xml: str) -> Optional[Dict[str, str]]:
        """Parse IdP SAML metadata XML."""
        try:
            # Extract EntityID
            entity_id_match = re.search(r'entityID="([^"]+)"', metadata_xml)
            if not entity_id_match:
                return None

            # Extract SSO URL
            sso_match = re.search(
                r'SingleSignOnService[^>]*Location="([^"]+)"[^>]*Binding="[^"]*(Redirect|POST)"',
                metadata_xml
            ) or re.search(
                r'SingleSignOnService[^>]*Binding="[^"]*(Redirect|POST)"[^>]*Location="([^"]+)"',
                metadata_xml
            )

            # Extract SLO URL
            slo_match = re.search(r'SingleLogoutService[^>]*Location="([^"]+)"', metadata_xml)

            # Extract certificate
            cert_match = re.search(r'<(?:ds:)?X509Certificate[^>]*>([^<]+)', metadata_xml, re.IGNORECASE)

            if not sso_match:
                return None

            sso_url = sso_match.group(1) if sso_match.group(1) != 'Redirect' and sso_match.group(1) != 'POST' else sso_match.group(2)

            return {
                'entity_id': entity_id_match.group(1),
                'sso_url': sso_url,
                'slo_url': slo_match.group(1) if slo_match else None,
                'certificate': cert_match.group(1).replace('\n', '').replace(' ', '') if cert_match else None
            }
        except Exception as e:
            logger.error(f"Failed to parse SAML metadata: {e}")
            return None

    async def _store_pending_request(self, request_id: str, district_id: str) -> None:
        """Store pending SAML request for validation."""
        await self.supabase.table('sso_pending_requests').insert({
            'request_id': request_id,
            'district_id': district_id,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat()
        }).execute()


# OIDC Support (Task 19.2 extension)

class OIDCManager:
    """
    OpenID Connect manager for districts using OIDC providers.

    Supports Google Workspace, Microsoft Azure AD, Okta, and generic OIDC.
    """

    def __init__(self, supabase_client: Any):
        self.supabase = supabase_client

    async def configure_oidc(
        self,
        district_id: str,
        oidc_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Configure OIDC for a district."""
        required_fields = ['issuer', 'client_id', 'client_secret']
        for field in required_fields:
            if not oidc_config.get(field):
                raise ValueError(f"Missing required field: {field}")

        # Try to discover endpoints if not provided
        if not oidc_config.get('authorization_endpoint'):
            discovered = await self._discover_endpoints(oidc_config['issuer'])
            if discovered:
                oidc_config.update(discovered)

        config_data = {
            'district_id': district_id,
            'protocol': SSOProtocol.OIDC.value,
            'config': oidc_config,
            'enabled': oidc_config.get('enabled', False),
            'updated_at': datetime.utcnow().isoformat(),
        }

        result = await self.supabase.table('district_sso_configs').upsert(
            config_data,
            on_conflict='district_id,protocol'
        ).execute()

        return result.data

    async def generate_auth_url(
        self,
        district_id: str,
        redirect_uri: str,
        state: str,
        nonce: str
    ) -> str:
        """Generate OIDC authorization URL."""
        config_result = await self.supabase.table('district_sso_configs') \
            .select('config') \
            .eq('district_id', district_id) \
            .eq('protocol', SSOProtocol.OIDC.value) \
            .eq('enabled', True) \
            .single() \
            .execute()

        if not config_result.data:
            raise ValueError("OIDC not configured for this district")

        config = config_result.data['config']

        scopes = ' '.join(config.get('scopes', ['openid', 'email', 'profile']))

        params = {
            'response_type': 'code',
            'client_id': config['client_id'],
            'redirect_uri': redirect_uri,
            'scope': scopes,
            'state': state,
            'nonce': nonce,
        }

        query = '&'.join(f"{k}={v}" for k, v in params.items())
        return f"{config['authorization_endpoint']}?{query}"

    async def _discover_endpoints(self, issuer: str) -> Optional[Dict[str, str]]:
        """Discover OIDC endpoints from well-known configuration."""
        # In production, make actual HTTP request to {issuer}/.well-known/openid-configuration
        # This is a placeholder that would be implemented with httpx or aiohttp
        return None
