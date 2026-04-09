'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

const promoteToFuelManager = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users and list them
    const users = await User.find({});

    if (users.length === 0) {
      console.log('❌ No users found. Please register first.');
      process.exit(1);
    }

    console.log('\n📋 Available users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.mobileNumber} - Role: ${user.role} - Name: ${user.profile.name}`);
    });

    // Promote all members and managers to fuelManager (or you can specify which one)
    const result = await User.updateMany(
      { role: { $in: ['member', 'manager'] } },
      { $set: { role: 'fuelManager' } }
    );

    console.log(`\n✅ Promoted ${result.modifiedCount} user(s) to fuelManager role`);

    // Verify
    const fuelManagers = await User.find({ role: 'fuelManager' });
    console.log(`\n⛽ Current fuelManagers:`);
    fuelManagers.forEach(mgr => {
      console.log(`   - ${mgr.mobileNumber} (${mgr.profile.name})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

promoteToFuelManager();
