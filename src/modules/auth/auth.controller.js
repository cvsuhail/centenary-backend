const jwt = require('jsonwebtoken');
const { eq } = require('drizzle-orm');
const db = require('../../common/db');
const { users } = require('../../common/schema');
const redis = require('../../common/redis');
const { success, error } = require('../../common/response');

const DELEGATE_DIRECTORY = {
  SSF: {
    name: 'SSF',
    members: {
      '+919876543210': {
        fullName: 'Muhammed Rafi',
        dob: '1996-08-12',
        entityDetails: { district: 'Malappuram', unit: 'SSF Unit 101' },
      },
      '+919562770397': {
        fullName: 'Test User',
        dob: '1990-01-01',
        entityDetails: { district: 'Test District', unit: 'SSF Test Unit' },
      },
    },
  },
  SYS: {
    name: 'SYS',
    members: {
      '+919876543211': {
        fullName: 'Niyas Ali',
        dob: '1998-04-03',
        entityDetails: { district: 'Kozhikode', unit: 'SYS Circle 08' },
      },
    },
  },
  KMJ: {
    name: 'KMJ',
    members: {
      '+919876543212': {
        fullName: 'Faisal K',
        dob: '1995-11-21',
        entityDetails: { district: 'Kannur', unit: 'KMJ Team 04' },
      },
    },
  },
  RSC: {
    name: 'RSC',
    members: {
      '+919876543213': {
        fullName: 'Ashraf M',
        dob: '1992-02-19',
        entityDetails: { district: 'Thrissur', unit: 'RSC Zone 3' },
      },
    },
  },
  ADMIN: {
    name: 'ADMIN',
    members: {
      '+919562770397': {
        fullName: 'Admin User',
        dob: '1990-01-01',
        entityDetails: { district: 'Admin', unit: 'System Administrator' },
      },
    },
  },
};

const normalizePhone = (phone = '') => String(phone).replace(/\s+/g, '');

const findDelegateMember = (delegate, phone) => {
  const delegateKey = String(delegate || '').trim().toUpperCase();
  const phoneKey = normalizePhone(phone);
  const delegateData = DELEGATE_DIRECTORY[delegateKey];
  if (!delegateData) return null;
  const profile = delegateData.members[phoneKey];
  if (!profile) return null;
  return { delegateKey, delegateName: delegateData.name, profile };
};

const checkUser = async (req, res) => {
  const { phone, delegate } = req.body;
  console.log('[Auth][check-user] Incoming request', { phone, delegate });

  if (!phone || !delegate) {
    console.log('[Auth][check-user] Missing phone or delegate');
    return error(res, 'Phone and delegate are required', 400);
  }

  const member = findDelegateMember(delegate, phone);
  if (!member) {
    console.log('[Auth][check-user] Delegate member not found', { phone, delegate });
    return error(res, `You are not part of selected delegate ${String(delegate).toUpperCase()}`, 404);
  }

  console.log('[Auth][check-user] Delegate member matched', {
    phone: normalizePhone(phone),
    delegate: member.delegateName,
    name: member.profile.fullName,
  });

  return success(res, {
    exists: true,
    data: {
      name: member.profile.fullName,
      dob: member.profile.dob,
      entityDetails: member.profile.entityDetails,
      delegate: member.delegateName,
    },
  }, 'User checked successfully');
};

const sendOtp = async (req, res) => {
  const { phone, delegate } = req.body;
  console.log('[Auth][send-otp] Incoming request', { phone, delegate });

  if (!phone || !delegate) {
    console.log('[Auth][send-otp] Missing phone or delegate');
    return error(res, 'Phone and delegate are required', 400);
  }

  const member = findDelegateMember(delegate, phone);
  if (!member) {
    console.log('[Auth][send-otp] Delegate member not found', { phone, delegate });
    return error(res, `You are not part of selected delegate ${String(delegate).toUpperCase()}`, 404);
  }

  // Use specific OTP for admin user
  const normalizedPhone = normalizePhone(phone);
  let otp = '1234'; // default OTP
  if (member.delegateKey === 'ADMIN' && normalizedPhone === '+919562770397') {
    otp = '2312'; // specific OTP for admin
  }
  
  await redis.set(`otp:${member.delegateKey}:${normalizedPhone}`, otp, 'EX', 120);
  console.log('[Auth][send-otp] OTP generated', {
    phone: normalizedPhone,
    delegate: member.delegateName,
    otp,
  });

  return success(res, { otp }, 'OTP sent successfully (dummy mode)');
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, delegate, name } = req.body;
    console.log('[Auth][verify-otp] Incoming request', { phone, delegate, otp });

    if (!phone || !otp || !delegate) {
      console.log('[Auth][verify-otp] Missing phone/delegate/otp');
      return error(res, 'Phone, delegate and OTP are required', 400);
    }

    const member = findDelegateMember(delegate, phone);
    if (!member) {
      console.log('[Auth][verify-otp] Delegate member not found', { phone, delegate });
      return error(res, `You are not part of selected delegate ${String(delegate).toUpperCase()}`, 404);
    }

    const normalizedPhone = normalizePhone(phone);
    const storedOtp = await redis.get(`otp:${member.delegateKey}:${normalizedPhone}`);
    console.log('[Auth][verify-otp] OTP compare', { normalizedPhone, providedOtp: otp, storedOtp });
    if (!storedOtp || storedOtp !== otp) {
      console.log('[Auth][verify-otp] Invalid or expired OTP');
      return error(res, 'Invalid or expired OTP', 400);
    }

    await redis.del(`otp:${member.delegateKey}:${normalizedPhone}`);

    // Check if user exists
    let [user] = await db.select().from(users).where(eq(users.phone, normalizedPhone));

    if (user) {
      // Update
      await db.update(users)
        .set({
          name: member.profile.fullName || name || user.name,
          delegate: member.delegateName,
          dob: member.profile.dob ? new Date(member.profile.dob) : user.dob,
          entityDetails: member.profile.entityDetails || user.entityDetails,
          updatedAt: new Date(),
        })
        .where(eq(users.phone, normalizedPhone));
      [user] = await db.select().from(users).where(eq(users.phone, normalizedPhone));
    } else {
      // Insert
      await db.insert(users).values({
        phone: normalizedPhone,
        delegate: member.delegateName,
        name: member.profile.fullName || name || 'Volunteer',
        dob: member.profile.dob ? new Date(member.profile.dob) : null,
        entityDetails: member.profile.entityDetails || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      [user] = await db.select().from(users).where(eq(users.phone, normalizedPhone));
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, delegate: user.delegate },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    return success(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        delegate: user.delegate,
        entityDetails: user.entityDetails,
      },
    }, 'OTP verified successfully');
  } catch (err) {
    console.error('[Auth][verify-otp] Error:', err);
    return error(res, err.message, 500, err);
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[Auth][admin-login] Incoming request', { email });

    if (!email || !password) {
      console.log('[Auth][admin-login] Missing email or password');
      return error(res, 'Email and password are required', 400);
    }

    // Check admin credentials
    if (email === 'ssfitdev@gmail.com' && password === '1234') {
      // Generate admin token
      const token = jwt.sign(
        { 
          id: 'admin', 
          email: email, 
          role: 'admin',
          name: 'Admin User'
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '30d' }
      );

      console.log('[Auth][admin-login] Admin login successful', { email });
      return success(res, {
        token,
        user: {
          id: 'admin',
          email: email,
          name: 'Admin User',
          role: 'admin',
        },
      }, 'Admin login successful');
    } else {
      console.log('[Auth][admin-login] Invalid credentials', { email });
      return error(res, 'Invalid email or password', 401);
    }
  } catch (err) {
    console.error('[Auth][admin-login] Error:', err);
    return error(res, err.message, 500, err);
  }
};

module.exports = { checkUser, sendOtp, verifyOtp, adminLogin };
