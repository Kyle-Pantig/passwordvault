// Test if middleware is running
// Run this in your browser console

console.log('🧪 Testing middleware...');

// Make a request to trigger middleware
fetch('/')
  .then(response => {
    console.log('✅ Request made, check terminal for middleware logs');
    console.log('Response status:', response.status);
  })
  .catch(error => {
    console.error('❌ Request failed:', error);
  });

// Also test a protected route
fetch('/security')
  .then(response => {
    console.log('✅ Security route request made');
    console.log('Response status:', response.status);
  })
  .catch(error => {
    console.error('❌ Security route failed:', error);
  });
