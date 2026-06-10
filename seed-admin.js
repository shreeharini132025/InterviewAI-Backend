const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seedAdmin() {
  try {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin'; // Using simple password 'admin' for easy login
    
    // Check if admin already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (existing.length > 0) {
      console.log('Admin already exists! You can log in with:');
      console.log('Email:', adminEmail);
      console.log('Password (if untouched):', adminPassword);
      process.exit(0);
    }
    
    console.log('Creating admin account...');
    const hashed = await bcrypt.hash(adminPassword, 12);
    
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['System Admin', adminEmail, hashed, 'admin']
    );
    
    console.log('✅ Admin successfully created in the database.');
    console.log('You can now log in with:');
    console.log('Email: admin@example.com');
    console.log('Password: admin');
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    process.exit(0);
  }
}

seedAdmin();