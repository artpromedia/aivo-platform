/**
 * Seed Sample LTI Tool Configuration
 * 
 * Run with: node scripts/seed-sample-tool.mjs
 * 
 * This creates a sample Canvas LTI tool registration for testing.
 * Replace the values with your actual LMS configuration.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding sample LTI tool configuration...\n');

  // Sample Canvas configuration
  // Replace these with your actual Canvas instance details
  const sampleTool = await prisma.ltiTool.upsert({
    where: {
      tenantId_issuer_clientId_deploymentId: {
        tenantId: '00000000-0000-0000-0000-000000000001', // Replace with actual tenant ID
        issuer: 'https://canvas.instructure.com',
        clientId: '10000000000001', // Replace with actual client ID from Canvas
        deploymentId: '1:00000000000001', // Replace with actual deployment ID
      },
    },
    update: {},
    create: {
      tenantId: '00000000-0000-0000-0000-000000000001',
      platformType: 'CANVAS',
      platformName: 'Sample Canvas Instance',
      clientId: '10000000000001',
      deploymentId: '1:00000000000001',
      issuer: 'https://canvas.instructure.com',
      authLoginUrl: 'https://canvas.instructure.com/api/lti/authorize_redirect',
      authTokenUrl: 'https://canvas.instructure.com/login/oauth2/token',
      jwksUrl: 'https://canvas.instructure.com/api/lti/security/jwks',
      toolPrivateKeyRef: 'default', // References the default key
      toolPublicKeyId: 'lti-key-1',
      enabled: true,
      configJson: {
        notes: 'Sample configuration - update with real values',
      },
    },
  });

  console.log('✅ Sample LTI tool created:');
  console.log(`   ID: ${sampleTool.id}`);
  console.log(`   Platform: ${sampleTool.platformName}`);
  console.log(`   Client ID: ${sampleTool.clientId}`);
  console.log(`   Issuer: ${sampleTool.issuer}`);
  console.log('\n');

  // Print configuration instructions
  console.log('📋 Canvas LTI 1.3 Developer Key Configuration:\n');
  console.log('In Canvas Admin > Developer Keys > + LTI Key:\n');
  console.log(`   Key Name: Aivo Learning Platform`);
  console.log(`   Title: Aivo`);
  console.log(`   Description: Adaptive learning activities from Aivo`);
  console.log(`   Target Link URI: ${process.env.LTI_BASE_URL || 'http://localhost:3008'}/lti/launch`);
  console.log(`   OpenID Connect Initiation URL: ${process.env.LTI_BASE_URL || 'http://localhost:3008'}/lti/login`);
  console.log(`   JWK Method: Public JWK URL`);
  console.log(`   Public JWK URL: ${process.env.LTI_BASE_URL || 'http://localhost:3008'}/lti/jwks?toolId=${sampleTool.id}`);
  console.log('\n');
  console.log('   LTI Advantage Services:');
  console.log('   ✓ Can create and view assignment data in the gradebook');
  console.log('   ✓ Can view submission data for assignments');
  console.log('   ✓ Can create and update submission results');
  console.log('   ✓ Can retrieve user data');
  console.log('\n');

  console.log('⚠️  Remember to update the tool registration with actual values from Canvas!');
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
