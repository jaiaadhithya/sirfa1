#!/usr/bin/env node

/**
 * Health Check Script for SIRFA Agent Finance Backend
 * Used by Docker containers and deployment platforms
 */

const http = require('http');
const process = require('process');

// Configuration
const config = {
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3001,
  timeout: 5000,
  path: '/api/health'
};

/**
 * Perform health check
 */
function healthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: config.path,
      method: 'GET',
      timeout: config.timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.status === 'healthy') {
              resolve({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                response: response
              });
            } else {
              reject(new Error(`Health check failed: ${response.message || 'Unknown error'}`));
            }
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Health check timeout after ${config.timeout}ms`));
    });

    req.setTimeout(config.timeout);
    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log(`🏥 Performing health check on ${config.host}:${config.port}${config.path}`);
    
    const result = await healthCheck();
    
    console.log('✅ Health check passed:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception during health check:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection during health check:', reason);
  process.exit(1);
});

// Run health check if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { healthCheck, config };