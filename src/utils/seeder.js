'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/database');
const User = require('../models/user.model');
const { ROLES, BCRYPT_SALT_ROUNDS } = require('../config/constants');

const seed = async () => {
  await connectDB();

  await User.deleteMany({});

  const hashedPassword = await bcrypt.hash('Manager@123', BCRYPT_SALT_ROUNDS);

  const manager = await User.create({
    mobileNumber: '9000000001',
    password: hashedPassword,
    role: ROLES.MANAGER,
    profile: {
      name: 'Station Manager',
      societyName: 'Water Filling Station HQ',
      address: 'Station Road, City',
      contactPerson: 'Station Manager',
    },
    isActive: true,
  });

  const memberPassword = await bcrypt.hash('Member@123', BCRYPT_SALT_ROUNDS);

  await User.create({
    mobileNumber: '9000000002',
    password: memberPassword,
    role: ROLES.MEMBER,
    profile: {
      name: 'John Doe',
      societyName: 'Green Valley Society',
      address: '42, Green Valley, Sector 5, Pune - 411001',
      contactPerson: 'John Doe',
    },
    isActive: true,
  });

  console.log('✅ Seeded Manager:', manager.mobileNumber, '/ password: Manager@123');
  console.log('✅ Seeded Member: 9000000002 / password: Member@123');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
