// Test script for single session enforcement
// Run this in your browser console after setting up the database schema

console.log('Testing Single Session Enforcement...');

// Test 1: Register a session
async function testSessionRegistration() {
  console.log('Test 1: Registering session...');
  try {
    const response = await fetch('/api/sessions/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    console.log('Session registration result:', result);
    return result.success;
  } catch (error) {
    console.error('Session registration failed:', error);
    return false;
  }
}

// Test 2: Validate session
async function testSessionValidation() {
  console.log('Test 2: Validating session...');
  try {
    const response = await fetch('/api/sessions/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    console.log('Session validation result:', result);
    return result.valid;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
}

// Test 3: Cleanup sessions
async function testSessionCleanup() {
  console.log('Test 3: Cleaning up sessions...');
  try {
    const response = await fetch('/api/sessions/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    console.log('Session cleanup result:', result);
    return result.success;
  } catch (error) {
    console.error('Session cleanup failed:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting single session enforcement tests...');
  
  const test1 = await testSessionRegistration();
  const test2 = await testSessionValidation();
  const test3 = await testSessionCleanup();
  
  console.log('\nTest Results:');
  console.log('✓ Session Registration:', test1 ? 'PASS' : 'FAIL');
  console.log('✓ Session Validation:', test2 ? 'PASS' : 'FAIL');
  console.log('✓ Session Cleanup:', test3 ? 'PASS' : 'FAIL');
  
  if (test1 && test2 && test3) {
    console.log('\n🎉 All tests passed! Single session enforcement is working correctly.');
  } else {
    console.log('\n❌ Some tests failed. Check the console for errors.');
  }
}

// Instructions for manual testing
console.log(`
Manual Testing Instructions:

1. Open two different browsers (or incognito windows)
2. Sign in to your app in both browsers
3. The first browser should be signed out automatically
4. Check that you see the "session terminated" message

To run automated tests, execute: runTests()
`);

// Make the function available globally
window.runTests = runTests;
