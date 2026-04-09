'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

const promoteSpecificUserToFuelManager = async () => {
  try {
    // Get mobile number from command line arguments
    const mobileNumber = process.argv[2];

    if (!mobileNumber) {
      console.log('❌ Please provide a mobile number as argument.');
      console.log('Usage: node src/utils/promote-user-to-fuel-manager.js <mobile_number>');
      console.log('Example: node src/utils/promote-user-to-fuel-manager.js 9000000001');
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find user by mobile number
    const user = await User.findOne({ mobileNumber });

    if (!user) {
      console.log(`❌ No user found with mobile number ${mobileNumber}`);
      process.exit(1);
    }

    console.log(`\n📋 Current user details:`);
    console.log(`   Mobile: ${user.mobileNumber}`);
    console.log(`   Name: ${user.profile.name}`);
    console.log(`   Current Role: ${user.role}`);

    // Update user role to fuelManager
    user.role = 'fuelManager';
    await user.save();

    console.log(`\n✅ User ${user.mobileNumber} has been promoted to fuelManager`);

    // Verify
    const updatedUser = await User.findOne({ mobileNumber });
    console.log(`   Updated Role: ${updatedUser.role}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('\n🎉 Done! This user can now access diesel filling endpoints.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

promoteSpecificUserToFuelManager();
