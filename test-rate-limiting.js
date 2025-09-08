// Simple test script to verify rate limiting functionality
// Run this after setting up the database schema

const testRateLimiting = async () => {
  const baseUrl = 'http://localhost:3000'; // Adjust if needed
  
  console.log('Testing rate limiting functionality...\n');
  
  // Test 1: Normal login attempt (should work if credentials are correct)
  console.log('Test 1: Normal login attempt');
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });
    
    const result = await response.json();
    console.log('Response:', result);
    console.log('Status:', response.status);
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Multiple failed attempts to trigger rate limiting
  console.log('Test 2: Multiple failed attempts');
  for (let i = 1; i <= 6; i++) {
    console.log(`Attempt ${i}:`);
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      });
      
      const result = await response.json();
      console.log(`  Status: ${response.status}`);
      console.log(`  Rate Limited: ${result.rateLimited || false}`);
      console.log(`  Remaining Attempts: ${result.remainingAttempts || 'N/A'}`);
      console.log(`  Error: ${result.error || 'None'}`);
      
      // Wait 1 second between attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Check admin endpoint (if admin secret is set)
  console.log('Test 3: Admin endpoint check');
  try {
    const response = await fetch(`${baseUrl}/api/admin/rate-limit-status`, {
      headers: { 'Authorization': 'Bearer test-admin-secret' }
    });
    
    const result = await response.json();
    console.log('Admin Response:', result);
  } catch (error) {
    console.log('Admin Error:', error.message);
  }
  
  console.log('\nRate limiting test completed!');
};

// Run the test
testRateLimiting().catch(console.error);
