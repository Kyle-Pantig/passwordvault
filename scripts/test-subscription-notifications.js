#!/usr/bin/env node

/**
 * Test script for subscription notifications
 * This script tests the notification system by creating test notifications
 * 
 * Usage:
 * node scripts/test-subscription-notifications.js
 */

const https = require('https');
const http = require('http');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function createTestNotification(userId, type, title, message) {
  const url = `${APP_URL}/api/notifications`;
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const data = JSON.stringify({
    type,
    title,
    message,
    data: { test: true },
    targetUserId: userId
  });

  return new Promise((resolve, reject) => {
    const client = APP_URL.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (res.statusCode === 200) {
            resolve(result);
          } else {
            reject(new Error(`API returned ${res.statusCode}: ${result.error || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

async function testNotifications() {
  // You'll need to replace this with an actual user ID from your database
  const testUserId = process.env.TEST_USER_ID || 'test-user-id';
  
  if (testUserId === 'test-user-id') {
    console.log('⚠️  Please set TEST_USER_ID environment variable with a real user ID');
    console.log('   Example: TEST_USER_ID=123e4567-e89b-12d3-a456-426614174000 node scripts/test-subscription-notifications.js');
    return;
  }

  const testNotifications = [
    {
      type: 'subscription_upgraded',
      title: 'Subscription Upgraded! 🎉',
      message: 'Congratulations! You\'ve successfully upgraded to the Plus plan. Enjoy your new features!'
    },
    {
      type: 'subscription_downgraded',
      title: 'Subscription Downgraded',
      message: 'Your subscription has been downgraded to the Free plan. Some features may no longer be available.'
    },
    {
      type: 'subscription_expiring',
      title: 'Subscription Expiring Soon ⚠️',
      message: 'Your Plus subscription will expire in 3 days. Renew now to keep your premium features!'
    },
    {
      type: 'subscription_expired',
      title: 'Subscription Expired',
      message: 'Your Plus subscription has expired. You\'ve been moved to the Free plan. Upgrade to restore premium features.'
    }
  ];

  console.log('🧪 Testing subscription notifications...');
  console.log(`📧 Target user ID: ${testUserId}`);
  console.log('');

  for (let i = 0; i < testNotifications.length; i++) {
    const notification = testNotifications[i];
    
    try {
      console.log(`📤 Creating ${notification.type} notification...`);
      const result = await createTestNotification(
        testUserId,
        notification.type,
        notification.title,
        notification.message
      );
      
      console.log(`✅ Success: ${result.notification?.id || 'Created'}`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
    
    // Add a small delay between requests
    if (i < testNotifications.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('');
  console.log('🎉 Test completed! Check the notification bell in your app to see the test notifications.');
  console.log('💡 Note: These are test notifications and can be safely deleted.');
}

async function main() {
  try {
    await testNotifications();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running test:', error.message);
    process.exit(1);
  }
}

// Run the test
main();
