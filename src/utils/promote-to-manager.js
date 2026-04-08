'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

const promoteToManager = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users with role 'member' and list them
    const users = await User.find({});
    
    if (users.length === 0) {
      console.log('❌ No users found. Please register first.');
      process.exit(1);
    }

    console.log('\n📋 Available users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.mobileNumber} - Role: ${user.role} - Name: ${user.profile.name}`);
    });

    // Promote all members to manager (or you can specify which one)
    const result = await User.updateMany(
      { role: 'member' },
      { $set: { role: 'manager' } }
    );

    console.log(`\n✅ Promoted ${result.modifiedCount} user(s) to manager role`);
    
    // Verify
    const managers = await User.find({ role: 'manager' });
    console.log(`\n👑 Current managers:`);
    managers.forEach(mgr => {
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

promoteToManager();
