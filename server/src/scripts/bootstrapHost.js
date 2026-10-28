const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Challenge = require('../models/Challenge');

async function bootstrapHost() {
  console.log('====================================================');
  console.log('🚀 Unanimous LeetCode Hub — Host Bootstrap CLI');
  console.log('====================================================');

  try {
    await connectDB();

    // Safety check: Check if ANY host account already exists
    const existingHost = await User.findOne({ role: 'host' });
    if (existingHost) {
      console.warn('⚠️  [Bootstrap Aborted] An existing Host account was detected:');
      console.warn(`   Email: ${existingHost.email}`);
      console.warn(`   Name:  ${existingHost.name}`);
      console.warn('⚠️  For security, this bootstrap tool will NEVER overwrite or replace an existing Host.');
      console.warn('   If you need to rotate Host credentials, update the record through authorized host workflows.');
      console.log('====================================================');
      await disconnectDB();
      process.exit(0);
    }

    // Extract credentials from environment variables securely
    const hostEmail = process.env.BOOTSTRAP_HOST_EMAIL && process.env.BOOTSTRAP_HOST_EMAIL.trim().toLowerCase();
    const hostPassword = process.env.BOOTSTRAP_HOST_PASSWORD;
    const hostName = (process.env.BOOTSTRAP_HOST_NAME || 'Primary Challenge Host').trim();
    const leetcodeHandle = (process.env.BOOTSTRAP_HOST_LEETCODE || '').trim();

    if (!hostEmail || !hostPassword) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'FATAL: BOOTSTRAP_HOST_EMAIL and BOOTSTRAP_HOST_PASSWORD environment variables are strictly required in production.'
        );
      }
      console.warn('⚠️  [SECURITY WARNING] BOOTSTRAP_HOST_EMAIL or BOOTSTRAP_HOST_PASSWORD not set in environment.');
      console.warn('⚠️  Falling back to development-only local credentials. DO NOT USE IN PRODUCTION.');
    }

    const finalEmail = hostEmail || 'host@unanimous.dev';
    const finalPassword = hostPassword || 'HostAdmin2026!';

    if (finalPassword.length < 8) {
      throw new Error('Host password must be at least 8 characters in length.');
    }

    console.log(`[Bootstrap] Creating initial Host account for: ${finalEmail}...`);
    const passwordHash = await User.hashPassword(finalPassword);

    const hostUser = await User.create({
      name: hostName,
      email: finalEmail,
      passwordHash,
      role: 'host',
      leetcodeUsername: leetcodeHandle,
      bio: 'Lead organizer & challenge coordinator for the Unanimous LeetCode Hub.',
    });

    console.log('✅ Host user created successfully:');
    console.log(`   ID:    ${hostUser._id}`);
    console.log(`   Email: ${hostUser.email}`);
    console.log(`   Role:  ${hostUser.role}`);

    // Create an initial default active challenge if none exists
    const existingChallenge = await Challenge.findOne({ host: hostUser._id });
    if (!existingChallenge) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 30); // 30-day challenge sprint

      const initialChallenge = await Challenge.create({
        title: 'Spring 2026 Competitive Programming Sprint',
        description: 'Daily algorithmic challenge sprint for student developers. Solve problems on LeetCode, submit daily reports, and compete on the leaderboard!',
        joinCode: 'SPRINT26',
        host: hostUser._id,
        startDate,
        endDate,
        status: 'active',
        rules: {
          maxSubmissionsPerDay: 5,
          allowMultipleSubmissionsPerDay: true,
          requireEvidence: false,
          pointsPolicy: 'manual',
          defaultPoints: {
            easy: 1,
            medium: 3,
            hard: 5,
          },
        },
      });

      console.log('✅ Initial Challenge initialized:');
      console.log(`   Title:     ${initialChallenge.title}`);
      console.log(`   Join Code: ${initialChallenge.joinCode}`);
    }

    console.log('====================================================');
    console.log('🎉 Bootstrap process completed successfully.');
    console.log('====================================================');

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('❌ Bootstrap failed with error:', err.message);
    await disconnectDB();
    process.exit(1);
  }
}

bootstrapHost();
