#!/usr/bin/env node

/**
 * SIRFA Agent Finance - Universal Deployment Script
 * Supports multiple hosting platforms with automated deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  platforms: {
    vercel: {
      name: 'Vercel',
      command: 'vercel --prod',
      description: 'Deploy to Vercel (Full-stack with serverless functions)'
    },
    netlify: {
      name: 'Netlify',
      command: 'cd frontend && netlify deploy --prod --dir=dist',
      description: 'Deploy frontend to Netlify'
    },
    heroku: {
      name: 'Heroku',
      command: 'git push heroku main',
      description: 'Deploy backend to Heroku'
    },
    railway: {
      name: 'Railway',
      command: 'railway deploy',
      description: 'Deploy to Railway'
    },
    surge: {
      name: 'Surge',
      command: 'cd frontend && npm run build && surge dist sirfa-agent-finance.surge.sh',
      description: 'Deploy frontend to Surge'
    }
  }
};

// Utility functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`\n🚀 ${description}`, 'info');
    log(`Running: ${command}`, 'info');
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    log(`✅ ${description} completed successfully!`, 'success');
    return true;
  } catch (error) {
    log(`❌ ${description} failed:`, 'error');
    log(error.message, 'error');
    return false;
  }
}

function checkPrerequisites() {
  log('🔍 Checking prerequisites...', 'info');
  
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    log('❌ package.json not found. Please run from project root.', 'error');
    process.exit(1);
  }
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    log(`❌ Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`, 'error');
    process.exit(1);
  }
  
  log('✅ Prerequisites check passed!', 'success');
}

function buildProject() {
  log('\n📦 Building project...', 'info');
  
  const buildSteps = [
    {
      command: 'npm run install:all',
      description: 'Installing all dependencies'
    },
    {
      command: 'cd frontend && npm run build',
      description: 'Building frontend'
    }
  ];
  
  for (const step of buildSteps) {
    if (!runCommand(step.command, step.description)) {
      log('❌ Build failed. Please fix the errors and try again.', 'error');
      process.exit(1);
    }
  }
  
  log('✅ Project built successfully!', 'success');
}

function deployToPlatform(platform) {
  const platformConfig = config.platforms[platform];
  
  if (!platformConfig) {
    log(`❌ Unknown platform: ${platform}`, 'error');
    log('Available platforms:', 'info');
    Object.keys(config.platforms).forEach(p => {
      log(`  - ${p}: ${config.platforms[p].description}`, 'info');
    });
    process.exit(1);
  }
  
  log(`\n🚀 Deploying to ${platformConfig.name}...`, 'info');
  
  if (runCommand(platformConfig.command, `Deploy to ${platformConfig.name}`)) {
    log(`\n🎉 Successfully deployed to ${platformConfig.name}!`, 'success');
  } else {
    log(`\n❌ Deployment to ${platformConfig.name} failed.`, 'error');
    process.exit(1);
  }
}

function showHelp() {
  log('\n🚀 SIRFA Agent Finance - Deployment Script', 'info');
  log('\nUsage: node deploy.js [platform] [options]', 'info');
  log('\nAvailable platforms:', 'info');
  
  Object.entries(config.platforms).forEach(([key, platform]) => {
    log(`  ${key.padEnd(10)} - ${platform.description}`, 'info');
  });
  
  log('\nOptions:', 'info');
  log('  --build-only    Build the project without deploying', 'info');
  log('  --skip-build    Skip the build step and deploy directly', 'info');
  log('  --help          Show this help message', 'info');
  
  log('\nExamples:', 'info');
  log('  node deploy.js vercel', 'info');
  log('  node deploy.js netlify --skip-build', 'info');
  log('  node deploy.js --build-only', 'info');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    showHelp();
    return;
  }
  
  checkPrerequisites();
  
  if (args.includes('--build-only')) {
    buildProject();
    log('\n✅ Build completed. Use --skip-build to deploy without rebuilding.', 'success');
    return;
  }
  
  if (!args.includes('--skip-build')) {
    buildProject();
  }
  
  const platform = args.find(arg => !arg.startsWith('--'));
  
  if (platform) {
    deployToPlatform(platform);
  } else {
    log('❌ No platform specified.', 'error');
    showHelp();
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught exception: ${error.message}`, 'error');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled rejection at: ${promise}, reason: ${reason}`, 'error');
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { deployToPlatform, buildProject, checkPrerequisites };