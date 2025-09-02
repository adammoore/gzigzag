/**
 * Test script to verify AdamChemDemo loads without connection conflicts
 */

const { createAdamChemDemo } = require('./packages/core/dist/demos/AdamChemDemo.js');

try {
  console.log('Testing AdamChemDemo creation...');
  const space = createAdamChemDemo();
  console.log('✅ SUCCESS: AdamChemDemo created without errors!');
  console.log(`📊 Space contains ${space.getCells().length} cells`);
  console.log(`🔄 Using ${space.getDimensions().length} dimensions`);
} catch (error) {
  console.error('❌ ERROR in AdamChemDemo:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}