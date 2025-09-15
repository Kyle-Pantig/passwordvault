#!/usr/bin/env node

/**
 * Script to check for expiring subscriptions and send notifications
 * This can be run manually or set up as a cron job
 * 
 * Usage:
 * node scripts/check-subscription-expiration.js
 * 
 * Environment variables required:
 * - NEXT_PUBLIC_APP_URL (or defaults to http://localhost:3000)
 * - CRON_SECRET (or defaults to 'default-secret')
 */

const https = require('https');
const http = require('http');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'default-secret';

async function checkExpiringSubscriptions() {
  const url = `${APP_URL}/api/subscription/check-expiring`;
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CRON_SECRET}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const client = APP_URL.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
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
    
    req.end();
  });
}

async function main() {
  try {
    console.log('🔍 Checking for expiring subscriptions...');
    const result = await checkExpiringSubscriptions();
    
    console.log('✅ Subscription expiration check completed successfully!');
    console.log(`📊 Results:`);
    console.log(`   - Expiring notifications sent: ${result.results.expiringNotifications}`);
    console.log(`   - Expired subscriptions handled: ${result.results.expiredNotifications}`);
    
    if (result.results.errors.length > 0) {
      console.log(`   - Errors: ${result.results.errors.length}`);
      result.results.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking subscription expiration:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
