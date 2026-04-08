'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Request = require('../models/request.model');

const checkRequest = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const requestId = '69d6178ac46959fd22ffeea0';
    
    const request = await Request.findById(requestId).populate('userId', 'mobileNumber profile');
    
    if (!request) {
      console.log(`❌ Request with ID ${requestId} NOT FOUND`);
      
      // Show all existing requests
      const allRequests = await Request.find({}).sort({ createdAt: -1 });
      if (allRequests.length > 0) {
        console.log('\n📋 Available requests:');
        allRequests.forEach((req, i) => {
          console.log(`${i + 1}. ID: ${req._id}`);
          console.log(`   Status: ${req.status}`);
          console.log(`   Society: ${req.societyName}`);
          console.log(`   Queue Position: ${req.queuePosition}`);
          console.log('');
        });
      } else {
        console.log('\n📋 No requests found in database.');
      }
    } else {
      console.log('✅ Request Found:');
      console.log(`   ID: ${request._id}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   Society: ${request.societyName}`);
      console.log(`   Queue Position: ${request.queuePosition}`);
      console.log(`   Tanker Assigned: ${request.tankerAssignment ? JSON.stringify(request.tankerAssignment, null, 2) : 'No'}`);
      
      if (request.status !== 'pending') {
        console.log(`\n⚠️  Cannot assign! Status is "${request.status}"`);
        console.log(`   Requests must be "pending" to assign a tanker.`);
        
        // Option to reset status to pending
        console.log('\n💡 To reset this request to pending, run this in MongoDB:');
        console.log(`   db.requests.updateOne({ _id: ObjectId("${request._id}") }, { $set: { status: "pending" } })`);
      } else {
        console.log('\n✅ Status is "pending". You can assign a tanker!');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkRequest();
