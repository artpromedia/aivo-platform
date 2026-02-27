"""Tests for SAML pure helper functions in SSOManager."""

import pytest
import base64
from datetime import datetime, timedelta

from sso_manager import SSOManager, UserRole, SSOUser


class FakeSupabase:
    """Stub supabase client for constructing SSOManager."""
    pass


@pytest.fixture
def manager():
    return SSOManager(FakeSupabase())


# ── _validate_certificate ────────────────────────────────────────────────────

class TestValidateCertificate:
    def test_valid_der_certificate(self, manager):
        # Construct a minimal byte sequence starting with 0x30 (SEQUENCE tag)
        raw = bytes([0x30, 0x82, 0x01, 0x00]) + b'\x00' * 256
        b64_cert = base64.b64encode(raw).decode()
        assert manager._validate_certificate(b64_cert) is True

    def test_valid_cert_with_pem_headers(self, manager):
        raw = bytes([0x30, 0x82, 0x01, 0x00]) + b'\x00' * 256
        b64_cert = base64.b64encode(raw).decode()
        pem = f"-----BEGIN CERTIFICATE-----\n{b64_cert}\n-----END CERTIFICATE-----"
        assert manager._validate_certificate(pem) is True

    def test_invalid_base64(self, manager):
        assert manager._validate_certificate("not-valid-base64!!!") is False

    def test_empty_string(self, manager):
        assert manager._validate_certificate("") is False

    def test_valid_base64_but_wrong_der_tag(self, manager):
        raw = bytes([0x01, 0x02, 0x03, 0x04])
        b64_cert = base64.b64encode(raw).decode()
        assert manager._validate_certificate(b64_cert) is False


# ── _validate_timestamps ────────────────────────────────────────────────────

class TestValidateTimestamps:
    def test_valid_timestamps(self, manager):
        now = datetime.utcnow()
        not_before = (now - timedelta(minutes=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
        not_after = (now + timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
        xml = f'<Conditions NotBefore="{not_before}" NotOnOrAfter="{not_after}"/>'
        assert manager._validate_timestamps(xml) is True

    def test_expired_assertion(self, manager):
        now = datetime.utcnow()
        not_before = (now - timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
        not_after = (now - timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
        xml = f'<Conditions NotBefore="{not_before}" NotOnOrAfter="{not_after}"/>'
        assert manager._validate_timestamps(xml) is False

    def test_future_assertion(self, manager):
        now = datetime.utcnow()
        not_before = (now + timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
        not_after = (now + timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
        xml = f'<Conditions NotBefore="{not_before}" NotOnOrAfter="{not_after}"/>'
        assert manager._validate_timestamps(xml) is False

    def test_within_clock_skew(self, manager):
        now = datetime.utcnow()
        # NotBefore is 3 minutes in the future — within 5 min skew
        not_before = (now + timedelta(minutes=3)).strftime('%Y-%m-%dT%H:%M:%SZ')
        not_after = (now + timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
        xml = f'<Conditions NotBefore="{not_before}" NotOnOrAfter="{not_after}"/>'
        assert manager._validate_timestamps(xml) is True

    def test_no_timestamps(self, manager):
        xml = '<Response><Status>OK</Status></Response>'
        assert manager._validate_timestamps(xml) is True


# ── _validate_saml_signature ────────────────────────────────────────────────

class TestValidateSamlSignature:
    def test_with_ds_signature(self, manager):
        xml = '<Response><ds:Signature><ds:SignatureValue>xxx</ds:SignatureValue></ds:Signature></Response>'
        assert manager._validate_saml_signature(xml, "cert") is True

    def test_with_plain_signature(self, manager):
        xml = '<Response><Signature><SignatureValue>xxx</SignatureValue></Signature></Response>'
        assert manager._validate_saml_signature(xml, "cert") is True

    def test_no_signature_rejects(self, manager):
        xml = '<Response><Status>OK</Status></Response>'
        assert manager._validate_saml_signature(xml, "cert") is False


# ── _extract_issuer ─────────────────────────────────────────────────────────

class TestExtractIssuer:
    def test_saml_prefixed_issuer(self, manager):
        xml = '<Response><saml:Issuer>https://idp.example.com</saml:Issuer></Response>'
        assert manager._extract_issuer(xml) == "https://idp.example.com"

    def test_saml2_prefixed_issuer(self, manager):
        xml = '<Response><saml2:Issuer>https://idp2.example.com</saml2:Issuer></Response>'
        assert manager._extract_issuer(xml) == "https://idp2.example.com"

    def test_no_issuer(self, manager):
        xml = '<Response><Status>OK</Status></Response>'
        assert manager._extract_issuer(xml) is None

    def test_strips_whitespace(self, manager):
        xml = '<Response><saml:Issuer>  https://idp.example.com  </saml:Issuer></Response>'
        assert manager._extract_issuer(xml) == "https://idp.example.com"


# ── _extract_session_index ──────────────────────────────────────────────────

class TestExtractSessionIndex:
    def test_extracts_session_index(self, manager):
        xml = '<AuthnStatement SessionIndex="_session_abc123" />'
        assert manager._extract_session_index(xml) == "_session_abc123"

    def test_no_session_index(self, manager):
        xml = '<AuthnStatement />'
        assert manager._extract_session_index(xml) is None


# ── _extract_claims ─────────────────────────────────────────────────────────

class TestExtractClaims:
    def test_extracts_name_id(self, manager):
        xml = '<Response><saml:NameID>user@example.com</saml:NameID></Response>'
        idp_config = {'config': {}}
        claims = manager._extract_claims(xml, idp_config)
        assert claims is not None
        assert claims['external_id'] == 'user@example.com'

    def test_extracts_attributes(self, manager):
        xml = '''<Response>
            <saml:NameID>user@example.com</saml:NameID>
            <saml:Attribute Name="email"><saml:AttributeValue>user@example.com</saml:AttributeValue></saml:Attribute>
            <saml:Attribute Name="given_name"><saml:AttributeValue>Jane</saml:AttributeValue></saml:Attribute>
        </Response>'''
        idp_config = {'config': {}}
        claims = manager._extract_claims(xml, idp_config)
        assert claims['email'] == 'user@example.com'
        assert claims['given_name'] == 'Jane'

    def test_no_name_id_returns_none(self, manager):
        xml = '<Response><Status>OK</Status></Response>'
        idp_config = {'config': {}}
        claims = manager._extract_claims(xml, idp_config)
        assert claims is None

    def test_extracts_roles(self, manager):
        xml = '''<Response>
            <saml:NameID>user@example.com</saml:NameID>
            <saml:Attribute Name="role">
                <saml:AttributeValue>teacher</saml:AttributeValue>
                <saml:AttributeValue>admin</saml:AttributeValue>
            </saml:Attribute>
        </Response>'''
        idp_config = {'config': {'role_claim': 'role'}}
        claims = manager._extract_claims(xml, idp_config)
        assert 'roles' in claims
        assert 'teacher' in claims['roles']
        assert 'admin' in claims['roles']


# ── _map_user_claims ────────────────────────────────────────────────────────

class TestMapUserClaims:
    def test_maps_basic_claims(self, manager):
        claims = {
            'external_id': 'ext-1',
            'email': 'user@example.com',
            'given_name': 'Jane',
            'family_name': 'Doe',
            'name': 'Jane Doe',
        }
        idp_config = {'config': {'default_role': 'TEACHER'}}
        user = manager._map_user_claims(claims, idp_config)
        assert isinstance(user, SSOUser)
        assert user.email == 'user@example.com'
        assert user.first_name == 'Jane'
        assert user.last_name == 'Doe'

    def test_maps_roles_with_role_mapping(self, manager):
        claims = {
            'external_id': 'ext-1',
            'email': 'user@example.com',
            'roles': ['staff', 'admin'],
        }
        idp_config = {
            'config': {
                'role_mapping': {'staff': 'TEACHER', 'admin': 'DISTRICT_ADMIN'},
                'default_role': 'TEACHER',
            }
        }
        user = manager._map_user_claims(claims, idp_config)
        assert UserRole.TEACHER in user.roles
        assert UserRole.DISTRICT_ADMIN in user.roles

    def test_default_role_when_no_mapping(self, manager):
        claims = {'external_id': 'ext-1', 'email': 'user@example.com'}
        idp_config = {'config': {'default_role': 'STUDENT'}}
        user = manager._map_user_claims(claims, idp_config)
        assert UserRole.STUDENT in user.roles

    def test_fallback_email_from_external_id(self, manager):
        claims = {'external_id': 'user@example.com'}
        idp_config = {'config': {}}
        user = manager._map_user_claims(claims, idp_config)
        assert user.email == 'user@example.com'


# ── _generate_authn_request ────────────────────────────────────────────────

class TestGenerateAuthnRequest:
    def test_generates_valid_xml(self, manager):
        xml = manager._generate_authn_request(
            request_id="_req_123",
            issue_instant="2024-01-01T00:00:00Z",
            destination="https://idp.example.com/sso",
            acs_url="https://aivo.edu/auth/saml/acs/test",
            issuer="https://aivo.edu/saml/metadata",
        )
        assert '_req_123' in xml
        assert 'https://idp.example.com/sso' in xml
        assert 'https://aivo.edu/auth/saml/acs/test' in xml
        assert 'samlp:AuthnRequest' in xml

    def test_includes_force_authn(self, manager):
        xml = manager._generate_authn_request(
            request_id="_r1", issue_instant="2024-01-01T00:00:00Z",
            destination="https://idp.example.com/sso",
            acs_url="https://aivo.edu/auth/saml/acs/test",
            issuer="https://aivo.edu/saml/metadata",
            force_authn=True,
        )
        assert 'ForceAuthn="true"' in xml

    def test_no_force_authn_by_default(self, manager):
        xml = manager._generate_authn_request(
            request_id="_r1", issue_instant="2024-01-01T00:00:00Z",
            destination="https://idp.example.com/sso",
            acs_url="https://aivo.edu/auth/saml/acs/test",
            issuer="https://aivo.edu/saml/metadata",
        )
        assert 'ForceAuthn="true"' not in xml


# ── generate_sp_metadata ────────────────────────────────────────────────────

class TestGenerateSPMetadata:
    def test_generates_metadata(self, manager):
        xml = manager.generate_sp_metadata("westside-unified")
        assert 'entityID="https://aivo.edu/saml/metadata"' in xml
        assert 'https://aivo.edu/auth/saml/acs/westside-unified' in xml
        assert 'https://aivo.edu/auth/saml/slo/westside-unified' in xml
        assert 'SPSSODescriptor' in xml

    def test_contains_nameid_format(self, manager):
        xml = manager.generate_sp_metadata("test")
        assert 'emailAddress' in xml


# ── _parse_saml_metadata ───────────────────────────────────────────────────

class TestParseSamlMetadata:
    def test_parses_metadata(self, manager):
        metadata = '''<md:EntityDescriptor entityID="https://idp.example.com">
            <md:IDPSSODescriptor>
                <md:SingleSignOnService
                    Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                    Location="https://idp.example.com/sso"/>
                <md:SingleLogoutService
                    Location="https://idp.example.com/slo"/>
                <ds:X509Certificate>MIICBASE64CERT</ds:X509Certificate>
            </md:IDPSSODescriptor>
        </md:EntityDescriptor>'''
        result = manager._parse_saml_metadata(metadata)
        assert result is not None
        assert result['entity_id'] == 'https://idp.example.com'
        assert result['sso_url'] == 'https://idp.example.com/sso'
        assert result['slo_url'] == 'https://idp.example.com/slo'
        assert result['certificate'] == 'MIICBASE64CERT'

    def test_missing_entity_id(self, manager):
        metadata = '<md:EntityDescriptor><md:IDPSSODescriptor></md:IDPSSODescriptor></md:EntityDescriptor>'
        result = manager._parse_saml_metadata(metadata)
        assert result is None

    def test_missing_sso_url(self, manager):
        metadata = '<md:EntityDescriptor entityID="https://idp.example.com"><md:IDPSSODescriptor></md:IDPSSODescriptor></md:EntityDescriptor>'
        result = manager._parse_saml_metadata(metadata)
        assert result is None

    def test_invalid_xml(self, manager):
        result = manager._parse_saml_metadata("not xml at all")
        assert result is None
