/**
 * FLOW — Industry-Level Seed Script
 *
 * Creates a realistic freight brokerage ecosystem:
 * - 12 users across all 5 roles (admin, broker, carrier, independent_driver, company_driver)
 * - 5 companies (2 brokerages, 2 trucking companies, 1 owner-operator)
 * - 24 trucks with real specs, insurance, compliance data
 * - 60 loads spanning ALL statuses (draft, posted, booked, in_transit, delivered, completed, cancelled)
 * - Booking requests, counter offers, saved searches, preferred lanes
 * - Team memberships with proper roles (Owner, Dispatcher, Driver)
 *
 * Usage: node seed-industry.js
 * Prerequisite: MongoDB running at mongodb://localhost:27017
 * WARNING: Drops existing data in flow_auth, flow_users, flow_fleet, flow_loads databases
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// ── CONFIG ──────────────────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb+srv://agentfox:agentfox2024@cluster0.llg4qjj.mongodb.net';
const DEFAULT_PASSWORD = 'Demo@123';
const NOW = new Date();
const NOW_MS = NOW.getTime();
const ONE_DAY = 24 * 60 * 60 * 1000;

// ── CONNECTIONS ─────────────────────────────────────────────────────────────
const connOpts = { maxPoolSize: 10, minPoolSize: 2 };
const authConn = mongoose.createConnection(MONGO_URI, { ...connOpts, dbName: 'flow_auth' });
const usersConn = mongoose.createConnection(MONGO_URI, { ...connOpts, dbName: 'flow_users' });
const fleetConn = mongoose.createConnection(MONGO_URI, { ...connOpts, dbName: 'flow_fleet' });
const loadsConn = mongoose.createConnection(MONGO_URI, { ...connOpts, dbName: 'flow_loads' });

// ── SCHEMAS ─────────────────────────────────────────────────────────────────

// User (auth)
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'broker', 'carrier', 'independent_driver', 'company_driver'],
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    emailVerified: { type: Boolean, default: true },
    emailVerifyToken: { type: String, default: null },
    emailVerifyTokenExpiresAt: { type: Date, default: null },
    identityVerified: { type: Boolean, default: true },
    identityStatus: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected', null],
      default: 'approved',
    },
    verificationDocuments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    stripeAccountId: { type: String, default: null },
    stripeAccountStatus: { type: String, enum: ['pending', 'connected', null], default: null },
    isOnboardingComplete: { type: Boolean, default: true },
    onboardingSteps: {
      type: { profile: Boolean, business: Boolean, stripe: Boolean, preferences: Boolean },
      default: { profile: true, business: true, stripe: true, preferences: true },
    },
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending_onboarding', 'pending_verification', 'active', 'suspended', 'deactivated'],
      default: 'active',
    },
  },
  { timestamps: true },
);
userSchema.index({ email: 1 }, { unique: true });
const User = authConn.model('User', userSchema);

// Organization
const orgSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mcNumber: { type: String, default: null },
    dotNumber: { type: String, default: null },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      zip: String,
    },
    scacCode: { type: String, default: null },
    factoringCompany: { type: String, default: null },
    ownerId: { type: String, required: true },
  },
  { timestamps: true },
);
const Organization = usersConn.model('Organization', orgSchema);

// Role
const roleSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);
roleSchema.index({ orgId: 1, name: 1 }, { unique: true });
const Role = usersConn.model('Role', roleSchema);

// Profile
const profileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    orgId: { type: String, required: true },
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: { type: String, default: null },
    phone: { type: String, default: null },
    timezone: { type: String, default: 'America/Chicago' },
    notificationPreferences: {
      type: {
        email: { enabled: Boolean, events: [String] },
        push: { enabled: Boolean, events: [String] },
        inapp: { enabled: Boolean, events: [String] },
      },
      default: () => ({
        email: { enabled: true, events: [] },
        push: { enabled: true, events: [] },
        inapp: { enabled: true, events: [] },
      }),
    },
  },
  { timestamps: true },
);
const Profile = usersConn.model('Profile', profileSchema);

// Membership
const membershipSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    orgId: { type: String, required: true },
    roleId: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive', 'invited'], default: 'active' },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
membershipSchema.index({ userId: 1, orgId: 1 }, { unique: true });
const Membership = usersConn.model('Membership', membershipSchema);

// Invite
const inviteSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    invitedBy: { type: String, required: true },
    email: { type: String, required: true },
    roleId: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
const Invite = usersConn.model('Invite', inviteSchema);

// Truck
const truckSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    plateNumber: { type: String, required: true },
    plateState: { type: String, required: true },
    internalId: { type: String, required: true },
    vin: { type: String, default: null, sparse: true },
    type: {
      type: String,
      required: true,
      enum: [
        'dry_van',
        'flatbed',
        'reefer',
        'step_deck',
        'lowboy',
        'tanker',
        'power_only',
        'sprinter_van',
        'box_truck',
        'hot_shot',
        'heavy_haul',
        'conestoga',
      ],
    },
    year: { type: Number, default: null },
    make: { type: String, default: null },
    vehicleModel: { type: String, default: null },
    engineType: { type: String, default: null },
    status: {
      type: String,
      default: 'available',
      enum: [
        'available',
        'assigned',
        'en_route',
        'loading',
        'loaded',
        'in_transit',
        'unloading',
        'maintenance',
        'decommissioned',
        'removed',
      ],
    },
    assignedDriverId: { type: String, default: null },
    assignedDriverName: { type: String, default: null },
    driverAssignedAt: { type: Date, default: null },
    gpsDeviceId: { type: String, default: null },
    linkedTrailerId: { type: String, default: null },
    activeLoadId: { type: String, default: null },
    insurancePolicy: { type: String, default: null },
    insuranceCarrier: { type: String, default: null },
    insuranceExpiry: { type: Date, default: null },
    registrationNumber: { type: String, default: null },
    registrationExpiry: { type: Date, default: null },
    inspectionExpiry: { type: Date, default: null },
    photos: { type: [String], default: [] },
    specs: {
      type: {
        maxWeight: { type: Number, default: null },
        length: { type: Number, default: null },
        hasLiftgate: { type: Boolean, default: false },
        isHazmatCertified: { type: Boolean, default: false },
      },
      default: {},
    },
  },
  { timestamps: true },
);
const Truck = fleetConn.model('Truck', truckSchema);

// Compliance
const complianceSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    driverId: { type: String, required: true, unique: true },
    driverName: { type: String, required: true },
    cdlNumber: { type: String, required: true },
    cdlState: { type: String, required: true },
    cdlExpiryDate: { type: Date, required: true },
    medicalCardExpiryDate: { type: Date, required: true },
    lastCheckedAt: { type: Date, default: Date.now },
    alertsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const Compliance = fleetConn.model('Compliance', complianceSchema);

// Load
const loadAddressSchema = new mongoose.Schema(
  {
    address: String,
    city: String,
    state: String,
    zip: String,
    lat: Number,
    lng: Number,
    contactName: String,
    contactPhone: String,
  },
  { _id: false },
);

const loadSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
    shipperName: { type: String, required: true },
    shipperPhone: { type: String, required: true },
    shipperEmail: { type: String, required: true },
    referenceNumber: { type: String, default: null },
    origin: { type: loadAddressSchema, required: true },
    destination: { type: loadAddressSchema, required: true },
    pickupDate: { type: Date, required: true },
    deliveryDate: { type: Date, required: true },
    pickupWindow: { type: { start: String, end: String }, default: null },
    deliveryWindow: { type: { start: String, end: String }, default: null },
    weight: { type: Number, required: true },
    truckType: { type: String, required: true },
    commodity: { type: String, default: null },
    hazardousClass: { type: String, default: null },
    temperatureMin: { type: Number, default: null },
    temperatureMax: { type: Number, default: null },
    rate: { type: Number, required: true },
    rateType: {
      type: String,
      required: true,
      enum: ['per_mile', 'per_trip', 'per_hour', 'per_hundred_weight'],
    },
    rateNegotiable: { type: Boolean, default: false },
    specialRequirements: { type: String, default: null },
    isPublic: { type: Boolean, default: true },
    requireVerifiedCarrier: { type: Boolean, default: false },
    internalNotes: { type: String, default: null },
    status: {
      type: String,
      default: 'draft',
      enum: [
        'draft',
        'created',
        'posted',
        'booked',
        'in_transit',
        'delivered',
        'completed',
        'cancelled',
        'archived',
      ],
    },
    statusHistory: {
      type: [{ status: String, changedBy: String, changedAt: Date, note: String }],
      default: [],
    },
    assignedTruckId: { type: String, default: null },
    assignedDriverId: { type: String, default: null },
    assignedAt: { type: Date, default: null },
    bookingRequestCount: { type: Number, default: 0 },
    confirmedBookingId: { type: String, default: null },
    estimatedDistance: { type: Number, default: null },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
const Load = loadsConn.model('Load', loadSchema);

// Booking Request
const bookingReqSchema = new mongoose.Schema(
  {
    loadId: { type: String, required: true, index: true },
    carrierOrgId: { type: String, required: true },
    carrierUserId: { type: String, required: true },
    truckId: { type: String, required: true },
    driverId: { type: String, required: true },
    proposedRate: { type: Number, default: null },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'accepted', 'denied', 'cancelled', 'counter_offer'],
    },
    respondedBy: { type: String, default: null },
    respondedAt: { type: Date, default: null },
    denialReason: { type: String, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
const BookingRequest = loadsConn.model('BookingRequest', bookingReqSchema, 'booking_requests');

// Counter Offer
const counterOfferSchema = new mongoose.Schema(
  {
    loadId: { type: String, required: true },
    bookingRequestId: { type: String, default: null },
    offeredBy: { type: String, required: true },
    offeredTo: { type: String, required: true },
    proposedRate: { type: Number, required: true },
    originalRate: { type: Number, required: true },
    note: { type: String, default: null },
    status: { type: String, default: 'pending', enum: ['pending', 'accepted', 'rejected'] },
    direction: { type: String, required: true, enum: ['carrier_to_broker', 'broker_to_carrier'] },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
const CounterOffer = loadsConn.model('CounterOffer', counterOfferSchema, 'counter_offers');

// ── DATA ────────────────────────────────────────────────────────────────────

// 25 major US freight cities with real coordinates
const CITIES = {
  'Chicago, IL': { lat: 41.8781, lng: -87.6298, zip: '60601' },
  'Dallas, TX': { lat: 32.7767, lng: -96.797, zip: '75201' },
  'Los Angeles, CA': { lat: 34.0522, lng: -118.2437, zip: '90012' },
  'Phoenix, AZ': { lat: 33.4484, lng: -112.074, zip: '85001' },
  'Miami, FL': { lat: 25.7617, lng: -80.1918, zip: '33101' },
  'Atlanta, GA': { lat: 33.749, lng: -84.388, zip: '30301' },
  'Seattle, WA': { lat: 47.6062, lng: -122.3321, zip: '98101' },
  'Portland, OR': { lat: 45.5152, lng: -122.6784, zip: '97201' },
  'Denver, CO': { lat: 39.7392, lng: -104.9903, zip: '80201' },
  'New York, NY': { lat: 40.7128, lng: -74.006, zip: '10001' },
  'Houston, TX': { lat: 29.7604, lng: -95.3698, zip: '77001' },
  'Nashville, TN': { lat: 36.1627, lng: -86.7816, zip: '37201' },
  'Memphis, TN': { lat: 35.1495, lng: -90.049, zip: '38101' },
  'Cleveland, OH': { lat: 41.4993, lng: -81.6944, zip: '44101' },
  'Detroit, MI': { lat: 42.3314, lng: -83.0458, zip: '48201' },
  'Charlotte, NC': { lat: 35.2271, lng: -80.8431, zip: '28201' },
  'San Francisco, CA': { lat: 37.7749, lng: -122.4194, zip: '94102' },
  'Las Vegas, NV': { lat: 36.1699, lng: -115.1398, zip: '89101' },
  'Omaha, NE': { lat: 41.2565, lng: -95.9345, zip: '68101' },
  'Indianapolis, IN': { lat: 39.7684, lng: -86.1581, zip: '46201' },
  'Kansas City, MO': { lat: 39.0997, lng: -94.5786, zip: '64101' },
  'New Orleans, LA': { lat: 29.9511, lng: -90.0715, zip: '70112' },
  'Boston, MA': { lat: 42.3601, lng: -71.0589, zip: '02101' },
  'Salt Lake City, UT': { lat: 40.7608, lng: -111.891, zip: '84101' },
  'Columbus, OH': { lat: 39.9612, lng: -82.9988, zip: '43215' },
};

// Real truck specifications
const TRUCK_SPECS = [
  { make: 'Freightliner', model: 'Cascadia', engine: 'DD15 14.8L', year: 2023 },
  { make: 'Peterbilt', model: '579', engine: 'PACCAR MX-13', year: 2024 },
  { make: 'Kenworth', model: 'T680', engine: 'PACCAR MX-13', year: 2023 },
  { make: 'Volvo', model: 'VNL 860', engine: 'Volvo D13TC', year: 2024 },
  { make: 'International', model: 'LT625', engine: 'Cummins X15', year: 2022 },
  { make: 'Mack', model: 'Anthem', engine: 'Mack MP8', year: 2023 },
  { make: 'Western Star', model: '5700XE', engine: 'DD15 14.8L', year: 2024 },
  { make: 'Freightliner', model: 'M2 106', engine: 'Cummins B6.7', year: 2023 },
  { make: 'Peterbilt', model: '389', engine: 'Cummins X15', year: 2022 },
  { make: 'Kenworth', model: 'W900L', engine: 'PACCAR MX-13', year: 2023 },
];

function genVIN() {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) vin += chars[Math.floor(Math.random() * chars.length)];
  return vin;
}

function genPlate(state) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  let plate = '';
  for (let i = 0; i < 3; i++) plate += letters[Math.floor(Math.random() * letters.length)];
  plate += ' ';
  for (let i = 0; i < 4; i++) plate += digits[Math.floor(Math.random() * digits.length)];
  return { plateNumber: plate, plateState: state };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function realisticRate(commodity, distanceMiles) {
  const ratePerMile = {
    Electronics: 2.85,
    'Fresh Produce': 2.45,
    'Auto Parts': 2.15,
    Lumber: 1.95,
    Beverages: 2.35,
    'Construction Materials': 1.75,
    Pharmaceuticals: 3.25,
    Textiles: 1.85,
    Machinery: 2.55,
    Steel: 2.05,
    'Paper Products': 1.65,
    Chemicals: 2.95,
    'Food Products': 2.25,
    Plastics: 1.75,
    Furniture: 2.1,
    'Building Supplies': 1.8,
    Automotive: 2.3,
    'Pet Food': 1.9,
  };
  const rpm = ratePerMile[commodity] || 2.0;
  return Math.round(rpm * distanceMiles);
}

function genPhone() {
  const areaCodes = [
    '312',
    '214',
    '213',
    '602',
    '305',
    '404',
    '206',
    '503',
    '720',
    '212',
    '713',
    '615',
    '901',
    '216',
    '313',
    '704',
    '415',
    '702',
    '402',
    '317',
  ];
  const ac = areaCodes[Math.floor(Math.random() * areaCodes.length)];
  const n = Math.floor(1000000 + Math.random() * 9000000).toString();
  return `(${ac}) ${n.slice(0, 3)}-${n.slice(3)}`;
}

// ── PERMISSION DEFINITIONS ──────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  'loads.view',
  'loads.book',
  'loads.cancel',
  'fleet.view',
  'fleet.manage',
  'fleet.assign_drivers',
  'team.view',
  'team.manage',
  'payments.view',
  'analytics.view',
  'documents.view',
  'documents.upload',
];

const CARRIER_SYSTEM_ROLES = {
  Owner: ALL_PERMISSIONS,
  Dispatcher: [
    'loads.view',
    'loads.book',
    'loads.cancel',
    'fleet.view',
    'fleet.assign_drivers',
    'documents.view',
    'documents.upload',
  ],
  Driver: ['loads.view', 'fleet.view', 'documents.view', 'documents.upload'],
};

// ── MAIN SEED ───────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 FLOW Industry Seed — Starting...\n');

  // Wait for all connections
  console.log('⏳ Connecting to MongoDB Atlas...');
  await Promise.all([
    authConn.asPromise(),
    usersConn.asPromise(),
    fleetConn.asPromise(),
    loadsConn.asPromise(),
  ]);
  console.log('   Connected.\n');

  // Drop existing data
  console.log('🗑️  Dropping existing data...');
  await Promise.all([
    authConn.dropDatabase(),
    usersConn.dropDatabase(),
    fleetConn.dropDatabase(),
    loadsConn.dropDatabase(),
  ]);
  console.log('   Done.\n');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // ═══════════════════════════════════════════════════════════════════════════
  // USERS (12 users across all 5 roles)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('👤 Creating users...');

  const userDefs = [
    // Brokers (3)
    {
      email: 'sarah.chen@summitlogistics.com',
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'broker',
      orgOwner: true,
    },
    {
      email: 'marcus.williams@pacificfreight.com',
      firstName: 'Marcus',
      lastName: 'Williams',
      role: 'broker',
      orgOwner: true,
    },
    {
      email: 'lisa.rodriguez@pacificfreight.com',
      firstName: 'Lisa',
      lastName: 'Rodriguez',
      role: 'broker',
      orgOwner: false,
    },

    // Carriers — Iron Horse Transport (Owner + Dispatcher + Driver)
    {
      email: 'robert.johnson@ironhorse.com',
      firstName: 'Robert',
      lastName: 'Johnson',
      role: 'carrier',
      orgOwner: true,
    },
    {
      email: 'diana.martinez@ironhorse.com',
      firstName: 'Diana',
      lastName: 'Martinez',
      role: 'carrier',
      orgOwner: false,
    }, // Dispatcher
    {
      email: 'james.wilson@ironhorse.com',
      firstName: 'James',
      lastName: 'Wilson',
      role: 'company_driver',
      orgOwner: false,
    },
    {
      email: 'michael.brown@ironhorse.com',
      firstName: 'Michael',
      lastName: 'Brown',
      role: 'company_driver',
      orgOwner: false,
    },

    // Carriers — Midwest Express (Owner + Dispatcher + Driver)
    {
      email: 'patricia.taylor@midwestexpress.com',
      firstName: 'Patricia',
      lastName: 'Taylor',
      role: 'carrier',
      orgOwner: true,
    },
    {
      email: 'kevin.anderson@midwestexpress.com',
      firstName: 'Kevin',
      lastName: 'Anderson',
      role: 'carrier',
      orgOwner: false,
    }, // Dispatcher

    // Independent Driver
    {
      email: 'dave.trucking@gmail.com',
      firstName: 'Dave',
      lastName: 'Miller',
      role: 'independent_driver',
      orgOwner: true,
    },

    // Admin
    {
      email: 'admin@flowfreight.com',
      firstName: 'Alex',
      lastName: 'Morgan',
      role: 'admin',
      orgOwner: false,
    },
  ];

  const users = [];
  for (const def of userDefs) {
    const user = await User.create({
      email: def.email,
      passwordHash,
      role: def.role,
      firstName: def.firstName,
      lastName: def.lastName,
      emailVerified: true,
      identityVerified: true,
      identityStatus: 'approved',
      isOnboardingComplete: true,
      onboardingSteps: { profile: true, business: true, stripe: true, preferences: true },
      status: 'active',
      lastLoginAt: new Date(NOW_MS - Math.random() * 7 * ONE_DAY),
      verificationDocuments: [
        {
          url: `https://res.cloudinary.com/flow/demo/insurance_${def.lastName.toLowerCase()}.pdf`,
          type: 'application/pdf',
        },
        {
          url: `https://res.cloudinary.com/flow/demo/license_${def.lastName.toLowerCase()}.pdf`,
          type: 'application/pdf',
        },
      ],
    });
    users.push(user);
    console.log(`   ✓ ${def.firstName} ${def.lastName} (${def.role})`);
  }

  const userByEmail = {};
  users.forEach((u) => (userByEmail[u.email] = u));

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANIZATIONS (5 companies)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🏢 Creating organizations...');

  const orgDefs = [
    {
      name: 'Summit Logistics LLC',
      mcNumber: 'MC-784512',
      dotNumber: 'DOT-2948571',
      address: {
        line1: '200 W Madison St',
        line2: 'Suite 2200',
        city: 'Chicago',
        state: 'IL',
        zip: '60606',
      },
      scacCode: 'SMTL',
      factoringCompany: 'Triumph Business Capital',
      ownerEmail: 'sarah.chen@summitlogistics.com',
    },
    {
      name: 'Pacific Freight Brokers',
      mcNumber: 'MC-623901',
      dotNumber: 'DOT-2187345',
      address: {
        line1: '555 Market St',
        line2: 'Floor 15',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
      },
      scacCode: 'PCFB',
      factoringCompany: 'RTS Financial',
      ownerEmail: 'marcus.williams@pacificfreight.com',
    },
    {
      name: 'Iron Horse Transport Inc.',
      mcNumber: 'MC-891234',
      dotNumber: 'DOT-3456789',
      address: {
        line1: '4500 Transport Way',
        line2: '',
        city: 'Dallas',
        state: 'TX',
        zip: '75241',
      },
      scacCode: 'IRNH',
      factoringCompany: null,
      ownerEmail: 'robert.johnson@ironhorse.com',
    },
    {
      name: 'Midwest Express Carriers',
      mcNumber: 'MC-567890',
      dotNumber: 'DOT-2987654',
      address: {
        line1: '7800 Freight Rd',
        line2: '',
        city: 'Indianapolis',
        state: 'IN',
        zip: '46241',
      },
      scacCode: 'MWEX',
      factoringCompany: 'Apex Capital',
      ownerEmail: 'patricia.taylor@midwestexpress.com',
    },
    {
      name: 'Dave Miller Trucking',
      mcNumber: 'MC-345678',
      dotNumber: 'DOT-1876543',
      address: { line1: '15 Rural Route 3', line2: '', city: 'Omaha', state: 'NE', zip: '68114' },
      scacCode: 'DVML',
      factoringCompany: null,
      ownerEmail: 'dave.trucking@gmail.com',
    },
  ];

  const orgs = [];
  for (const def of orgDefs) {
    const owner = userByEmail[def.ownerEmail];
    const org = await Organization.create({
      name: def.name,
      mcNumber: def.mcNumber,
      dotNumber: def.dotNumber,
      address: def.address,
      scacCode: def.scacCode,
      factoringCompany: def.factoringCompany,
      ownerId: owner._id.toString(),
    });
    orgs.push(org);
    console.log(`   ✓ ${def.name} (MC: ${def.mcNumber})`);
  }

  // Map orgs by owner email for easy lookup
  const orgByOwnerEmail = {};
  orgDefs.forEach((def, i) => {
    orgByOwnerEmail[def.ownerEmail] = orgs[i];
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLES (company-level) & PROFILES & MEMBERSHIPS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n👥 Creating profiles, roles & memberships...');

  const orgRoles = {}; // orgId -> { roleName -> roleDoc }
  const allProfiles = [];

  for (const org of orgs) {
    // Create system roles for this org
    const roleMap = {};
    for (const [name, permissions] of Object.entries(CARRIER_SYSTEM_ROLES)) {
      const role = await Role.create({
        orgId: org._id.toString(),
        name,
        permissions,
        isSystem: true,
      });
      roleMap[name] = role;
    }
    orgRoles[org._id.toString()] = roleMap;
  }

  for (const def of userDefs) {
    const user = userByEmail[def.email];
    const isOrgOwner = def.orgOwner;

    // Determine which org this user belongs to
    let org;
    if (isOrgOwner) {
      org = orgByOwnerEmail[def.email];
    } else {
      // Non-owners belong to the org matching their email domain
      const domain = def.email.split('@')[1];
      for (const odef of orgDefs) {
        if (odef.ownerEmail.includes(domain)) {
          org = orgByOwnerEmail[odef.ownerEmail];
          break;
        }
      }
    }

    // Admin doesn't belong to any org
    if (def.role === 'admin') {
      const profile = await Profile.create({
        userId: user._id.toString(),
        orgId: 'admin', // Special orgId for admin
        email: def.email,
        firstName: def.firstName,
        lastName: def.lastName,
        phone: genPhone(),
        timezone: 'America/Chicago',
      });
      allProfiles.push(profile);
      continue;
    }

    if (!org) continue;

    const profile = await Profile.create({
      userId: user._id.toString(),
      orgId: org._id.toString(),
      email: def.email,
      firstName: def.firstName,
      lastName: def.lastName,
      phone: genPhone(),
      timezone: ['America/Chicago', 'America/New_York', 'America/Los_Angeles', 'America/Denver'][
        Math.floor(Math.random() * 4)
      ],
    });
    allProfiles.push(profile);

    // Determine company role name
    let companyRoleName;
    if (def.role === 'carrier' && isOrgOwner) companyRoleName = 'Owner';
    else if (def.role === 'carrier' && !isOrgOwner) companyRoleName = 'Dispatcher';
    else if (def.role === 'company_driver') companyRoleName = 'Driver';
    else if (def.role === 'independent_driver') companyRoleName = 'Owner';
    else if (def.role === 'broker' && isOrgOwner) companyRoleName = 'Owner';
    else companyRoleName = 'Driver';

    const role = orgRoles[org._id.toString()][companyRoleName];
    if (role) {
      await Membership.create({
        userId: user._id.toString(),
        orgId: org._id.toString(),
        roleId: role._id.toString(),
        status: 'active',
        joinedAt: new Date(NOW - Math.floor(Math.random() * 365) * ONE_DAY),
      });
    }
  }
  console.log(`   ✓ ${allProfiles.length} profiles, roles & memberships created`);

  // Create some pending invites for carriers
  const ironHorse = orgByOwnerEmail['robert.johnson@ironhorse.com'];
  const midwest = orgByOwnerEmail['patricia.taylor@midwestexpress.com'];
  const ironHorseRoles = orgRoles[ironHorse._id.toString()];
  const dispatcherRole = ironHorseRoles['Dispatcher'];
  const driverRole = ironHorseRoles['Driver'];

  await Invite.create({
    orgId: ironHorse._id.toString(),
    invitedBy: userByEmail['robert.johnson@ironhorse.com']._id.toString(),
    email: 'new.dispatcher@ironhorse.com',
    roleId: dispatcherRole._id.toString(),
    token: crypto.randomBytes(32).toString('hex'),
    status: 'pending',
    expiresAt: new Date(NOW_MS + 7 * ONE_DAY),
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRUCKS (24 vehicles with real specs, insurance, compliance)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🚛 Creating trucks...');

  const truckTypes = [
    'dry_van',
    'dry_van',
    'dry_van',
    'reefer',
    'reefer',
    'flatbed',
    'flatbed',
    'step_deck',
    'tanker',
    'box_truck',
    'heavy_haul',
    'conestoga',
  ];
  const states = ['IL', 'TX', 'CA', 'IN', 'NE', 'OH', 'TN', 'GA', 'MO', 'FL'];
  const insuranceCarriers = [
    'Progressive Commercial',
    'Great West Casualty',
    'Acuity Insurance',
    'Sentry Insurance',
    'Liberty Mutual',
    'Travelers',
  ];

  const allTrucks = [];
  const trucksByOrg = {};

  for (const org of orgs) {
    const orgId = org._id.toString();
    const ownerEmail = orgDefs.find((o) => orgs.indexOf(org) === orgDefs.indexOf(o))?.ownerEmail;
    const ownerUser = userByEmail[ownerEmail];
    const isIndependent = ownerUser?.role === 'independent_driver';

    // Carriers get 7-10 trucks, brokers get 0-2, independent gets 1
    let truckCount;
    if (isIndependent) truckCount = 1;
    else if (org.name.includes('Horse') || org.name.includes('Midwest')) truckCount = 10;
    else truckCount = Math.random() > 0.5 ? 2 : 0; // Brokerages occasionally have trucks

    const orgTrucks = [];

    for (let i = 0; i < truckCount; i++) {
      const spec = TRUCK_SPECS[Math.floor(Math.random() * TRUCK_SPECS.length)];
      const truckType = truckTypes[Math.floor(Math.random() * truckTypes.length)];
      const state = states[Math.floor(Math.random() * states.length)];
      const { plateNumber, plateState } = genPlate(state);
      const vin = genVIN();

      // Insurance dates
      const insExpiry = new Date(NOW_MS + (Math.random() * 365 + 90) * ONE_DAY); // 3-15 months out
      const regExpiry = new Date(NOW_MS + (Math.random() * 180 + 30) * ONE_DAY); // 1-7 months out
      const inspExpiry = new Date(NOW_MS + (Math.random() * 300 + 60) * ONE_DAY); // 2-12 months out

      const truck = await Truck.create({
        orgId,
        plateNumber,
        plateState,
        internalId: `UNIT-${String(i + 1).padStart(3, '0')}`,
        vin,
        type: truckType,
        year: spec.year,
        make: spec.make,
        vehicleModel: spec.model,
        engineType: spec.engine,
        status: 'available',
        insurancePolicy: `POL-${Math.floor(100000 + Math.random() * 900000)}`,
        insuranceCarrier: insuranceCarriers[Math.floor(Math.random() * insuranceCarriers.length)],
        insuranceExpiry: insExpiry,
        registrationNumber: `REG-${state}-${Math.floor(100000 + Math.random() * 900000)}`,
        registrationExpiry: regExpiry,
        inspectionExpiry: inspExpiry,
        photos: [
          `https://res.cloudinary.com/flow/demo/trucks/${spec.make.toLowerCase()}_${spec.model.toLowerCase()}_1.jpg`,
          `https://res.cloudinary.com/flow/demo/trucks/${spec.make.toLowerCase()}_${spec.model.toLowerCase()}_2.jpg`,
        ],
        specs: {
          maxWeight: truckType === 'heavy_haul' ? 80000 : truckType === 'flatbed' ? 48000 : 44000,
          length: truckType === 'heavy_haul' ? 53 : 48,
          hasLiftgate: truckType === 'box_truck',
          isHazmatCertified: ['tanker', 'heavy_haul'].includes(truckType) || Math.random() > 0.7,
        },
      });

      orgTrucks.push(truck);
      allTrucks.push(truck);
    }

    trucksByOrg[orgId] = orgTrucks;
    if (truckCount > 0) {
      console.log(`   ✓ ${org.name}: ${truckCount} trucks`);
    }
  }

  // Assign drivers to trucks for carriers
  const ironHorseOrg = orgByOwnerEmail['robert.johnson@ironhorse.com'];
  const midwestOrg = orgByOwnerEmail['patricia.taylor@midwestexpress.com'];
  const daveOrg = orgByOwnerEmail['dave.trucking@gmail.com'];

  // Assign company drivers to Iron Horse trucks
  const ironHorseDrivers = [
    { userId: userByEmail['james.wilson@ironhorse.com']._id.toString(), name: 'James Wilson' },
    { userId: userByEmail['michael.brown@ironhorse.com']._id.toString(), name: 'Michael Brown' },
  ];

  const ironHorseTrucks = trucksByOrg[ironHorseOrg._id.toString()] || [];
  for (let i = 0; i < Math.min(ironHorseDrivers.length, ironHorseTrucks.length); i++) {
    const truck = ironHorseTrucks[i];
    const driver = ironHorseDrivers[i];
    await Truck.findByIdAndUpdate(truck._id, {
      assignedDriverId: driver.userId,
      assignedDriverName: driver.name,
      driverAssignedAt: new Date(NOW_MS - Math.random() * 90 * ONE_DAY),
      status: 'assigned',
    });

    // Create compliance records
    await Compliance.create({
      orgId: ironHorseOrg._id.toString(),
      driverId: driver.userId,
      driverName: driver.name,
      cdlNumber: `CDL-${Math.floor(10000000 + Math.random() * 90000000)}`,
      cdlState: 'TX',
      cdlExpiryDate: new Date(NOW_MS + (Math.random() * 730 + 180) * ONE_DAY),
      medicalCardExpiryDate: new Date(NOW_MS + (Math.random() * 365 + 90) * ONE_DAY),
      lastCheckedAt: new Date(NOW_MS - 7 * ONE_DAY),
      alertsEnabled: true,
    });
  }

  // Assign independent driver to his truck
  const daveUser = userByEmail['dave.trucking@gmail.com'];
  const daveTrucks = trucksByOrg[daveOrg._id.toString()] || [];
  if (daveTrucks.length > 0) {
    await Truck.findByIdAndUpdate(daveTrucks[0]._id, {
      assignedDriverId: daveUser._id.toString(),
      assignedDriverName: 'Dave Miller',
      driverAssignedAt: new Date(NOW_MS - 180 * ONE_DAY),
      status: 'assigned',
    });
    await Compliance.create({
      orgId: daveOrg._id.toString(),
      driverId: daveUser._id.toString(),
      driverName: 'Dave Miller',
      cdlNumber: 'CDL-78451293',
      cdlState: 'NE',
      cdlExpiryDate: new Date(NOW_MS + 450 * ONE_DAY),
      medicalCardExpiryDate: new Date(NOW_MS + 180 * ONE_DAY),
      lastCheckedAt: new Date(NOW_MS - 14 * ONE_DAY),
      alertsEnabled: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADS (60 loads across all statuses)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📦 Creating loads...');

  const commodities = [
    'Electronics',
    'Fresh Produce',
    'Auto Parts',
    'Lumber',
    'Beverages',
    'Construction Materials',
    'Pharmaceuticals',
    'Textiles',
    'Machinery',
    'Steel',
    'Paper Products',
    'Chemicals',
    'Food Products',
    'Plastics',
    'Furniture',
    'Building Supplies',
    'Automotive',
    'Pet Food',
  ];

  // 60 routes — major US freight lanes
  const routes = [];
  const cityNames = Object.keys(CITIES);

  // Generate diverse routes
  for (let i = 0; i < 60; i++) {
    let origin, dest;
    do {
      origin = cityNames[Math.floor(Math.random() * cityNames.length)];
      dest = cityNames[Math.floor(Math.random() * cityNames.length)];
    } while (origin === dest);

    const commodity = commodities[Math.floor(Math.random() * commodities.length)];
    const truckTypeOptions = {
      'Fresh Produce': 'reefer',
      Pharmaceuticals: 'reefer',
      Beverages: 'dry_van',
      Electronics: 'dry_van',
      Textiles: 'dry_van',
      'Food Products': 'dry_van',
      Lumber: 'flatbed',
      Steel: 'flatbed',
      'Construction Materials': 'flatbed',
      Machinery: 'heavy_haul',
      'Auto Parts': 'step_deck',
      Chemicals: 'tanker',
    };
    const truckType = truckTypeOptions[commodity] || 'dry_van';
    routes.push({ origin, destination: dest, commodity, truckType });
  }

  // Status distribution (realistic proportions)
  const statusDistribution = [
    ...Array(3).fill('draft'), // 3 drafts
    ...Array(12).fill('posted'), // 12 posted (active marketplace)
    ...Array(10).fill('booked'), // 10 booked
    ...Array(8).fill('in_transit'), // 8 in transit
    ...Array(7).fill('delivered'), // 7 delivered (awaiting completion)
    ...Array(12).fill('completed'), // 12 completed
    ...Array(5).fill('cancelled'), // 5 cancelled
    ...Array(3).fill('archived'), // 3 archived
  ];

  // Load creators — maps org to its users for creating loads
  const loadOrgs = [
    orgByOwnerEmail['sarah.chen@summitlogistics.com'],
    orgByOwnerEmail['marcus.williams@pacificfreight.com'],
  ];

  const loadCreators = {};
  for (const org of loadOrgs) {
    const orgId = org._id.toString();
    const orgUsers = users.filter((u) => {
      const profile = allProfiles.find((p) => p.userId === u._id.toString() && p.orgId === orgId);
      return !!profile;
    });
    loadCreators[orgId] =
      orgUsers.length > 0
        ? orgUsers
        : [userByEmail[orgDefs.find((o) => orgs.indexOf(org) === orgDefs.indexOf(o))?.ownerEmail]];
  }

  const allLoads = [];
  const today = NOW_MS;

  for (let i = 0; i < 60; i++) {
    const route = routes[i];
    if (!route) {
      console.error(`  ⚠️ No route at index ${i}, routes.length=${routes.length}`);
      continue;
    }
    if (!CITIES[route.origin]) {
      console.error(
        `  ⚠️ Bad origin city at index ${i}: "${route.origin}", avail keys: ${Object.keys(CITIES).slice(0, 3).join(', ')}...`,
      );
      continue;
    }
    const status = statusDistribution[i];
    const orgIdx = i % loadOrgs.length;
    const org = loadOrgs[orgIdx];
    const orgId = org._id.toString();
    const orgCreators = loadCreators[orgId] || [];
    const creator = orgCreators[Math.floor(Math.random() * orgCreators.length)];

    const oCity = CITIES[route.origin];
    const dCity = CITIES[route.destination];
    if (!oCity || !dCity || oCity.lat == null || dCity.lat == null) {
      console.error(
        `  ⚠️ Bad city data at index ${i}: origin="${route.origin}" oCity=${JSON.stringify(oCity)}, dest="${route.destination}" dCity=${JSON.stringify(dCity)}`,
      );
      continue;
    }
    const distanceKm = haversineKm(oCity.lat, oCity.lng, dCity.lat, dCity.lng);
    const distanceMiles = Math.round(distanceKm * 0.621371);
    const baseRate = realisticRate(route.commodity, distanceMiles);

    // Timestamps based on status
    let pickupDate, deliveryDate, createdDate, postedDate, bookedDate, transitDate, deliveredDate;
    const shipperNames = [
      'Acme Corp',
      'GlobalTech Industries',
      'Fresh Foods Co',
      'BuildRight Supply',
      'MedLine Distribution',
      'SteelWorks Inc',
      'GreenLeaf Produce',
      'AutoPro Manufacturing',
    ];

    switch (status) {
      case 'draft':
        createdDate = new Date(today - Math.random() * 3 * ONE_DAY);
        pickupDate = new Date(today + (Math.random() * 14 + 3) * ONE_DAY);
        deliveryDate = new Date(pickupDate.getTime() + (Math.random() * 4 + 1) * ONE_DAY);
        break;
      case 'posted':
        createdDate = new Date(today - Math.random() * 7 * ONE_DAY);
        postedDate = new Date(createdDate.getTime() + Math.random() * 2 * ONE_DAY);
        pickupDate = new Date(today + (Math.random() * 10 + 2) * ONE_DAY);
        deliveryDate = new Date(pickupDate.getTime() + (Math.random() * 4 + 1) * ONE_DAY);
        break;
      case 'booked':
        createdDate = new Date(today - (Math.random() * 10 + 5) * ONE_DAY);
        postedDate = new Date(createdDate.getTime() + 1 * ONE_DAY);
        bookedDate = new Date(postedDate.getTime() + (Math.random() * 3 + 1) * ONE_DAY);
        pickupDate = new Date(today + (Math.random() * 5 + 1) * ONE_DAY);
        deliveryDate = new Date(pickupDate.getTime() + (Math.random() * 4 + 1) * ONE_DAY);
        break;
      case 'in_transit':
        createdDate = new Date(today - (Math.random() * 20 + 10) * ONE_DAY);
        postedDate = new Date(createdDate.getTime() + 1 * ONE_DAY);
        bookedDate = new Date(postedDate.getTime() + 3 * ONE_DAY);
        pickupDate = new Date(today - (Math.random() * 3 + 1) * ONE_DAY);
        deliveryDate = new Date(today + (Math.random() * 3 + 1) * ONE_DAY);
        break;
      case 'delivered':
        createdDate = new Date(today - (Math.random() * 25 + 10) * ONE_DAY);
        postedDate = new Date(createdDate.getTime() + 1 * ONE_DAY);
        bookedDate = new Date(postedDate.getTime() + 2 * ONE_DAY);
        pickupDate = new Date(today - (Math.random() * 10 + 5) * ONE_DAY);
        deliveryDate = new Date(today - (Math.random() * 3 + 1) * ONE_DAY);
        deliveredDate = deliveryDate;
        break;
      case 'completed':
        createdDate = new Date(today - (Math.random() * 60 + 30) * ONE_DAY);
        postedDate = new Date(createdDate.getTime() + 1 * ONE_DAY);
        bookedDate = new Date(postedDate.getTime() + 2 * ONE_DAY);
        pickupDate = new Date(bookedDate.getTime() + 3 * ONE_DAY);
        deliveryDate = new Date(pickupDate.getTime() + (Math.random() * 4 + 1) * ONE_DAY);
        deliveredDate = deliveryDate;
        break;
      case 'cancelled':
        createdDate = new Date(today - (Math.random() * 20 + 5) * ONE_DAY);
        postedDate = new Date(createdDate.getTime() + 1 * ONE_DAY);
        pickupDate = new Date(today + Math.random() * 14 * ONE_DAY);
        deliveryDate = new Date(pickupDate.getTime() + 4 * ONE_DAY);
        break;
      case 'archived':
        createdDate = new Date(today - (Math.random() * 120 + 60) * ONE_DAY);
        pickupDate = new Date(createdDate.getTime() + 14 * ONE_DAY);
        deliveryDate = new Date(pickupDate.getTime() + 4 * ONE_DAY);
        deliveredDate = deliveryDate;
        break;
      default:
        createdDate = new Date(today - Math.random() * 7 * ONE_DAY);
        pickupDate = new Date(today + 7 * ONE_DAY);
        deliveryDate = new Date(pickupDate.getTime() + 3 * ONE_DAY);
    }

    // Build status history
    const history = [];
    history.push({
      status: 'draft',
      changedBy: creator._id.toString(),
      changedAt: createdDate,
      note: 'Load created',
    });

    if (postedDate) {
      history.push({
        status: 'posted',
        changedBy: creator._id.toString(),
        changedAt: postedDate,
        note: 'Posted to marketplace',
      });
    }
    if (bookedDate) {
      history.push({
        status: 'booked',
        changedBy: creator._id.toString(),
        changedAt: bookedDate,
        note: 'Carrier assigned',
      });
    }
    if (status === 'in_transit' || status === 'delivered' || status === 'completed') {
      history.push({
        status: 'in_transit',
        changedBy: creator._id.toString(),
        changedAt: pickupDate,
        note: 'Shipment in transit',
      });
    }
    if (status === 'delivered' || status === 'completed') {
      history.push({
        status: 'delivered',
        changedBy: creator._id.toString(),
        changedAt: deliveredDate,
        note: 'Delivered to destination',
      });
    }
    if (status === 'completed') {
      history.push({
        status: 'completed',
        changedBy: creator._id.toString(),
        changedAt: new Date(deliveredDate.getTime() + 2 * ONE_DAY),
        note: 'Load completed',
      });
    }
    if (status === 'cancelled') {
      const cancelDate = new Date(
        postedDate
          ? postedDate.getTime() + (Math.random() * 5 + 1) * ONE_DAY
          : createdDate.getTime() + 3 * ONE_DAY,
      );
      const reasons = ['Shipper cancelled', 'Wrong pricing', 'Found private carrier', 'Other'];
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      history.push({
        status: 'cancelled',
        changedBy: creator._id.toString(),
        changedAt: cancelDate,
        note: reason,
      });
    }

    // Assign truck/driver for booked/in_transit/delivered/completed loads
    let assignedTruckId = null;
    let assignedDriverId = null;
    let assignedAt = null;
    let confirmedBookingId = null;
    let bookingRequestCount = 0;

    if (['booked', 'in_transit', 'delivered', 'completed'].includes(status)) {
      // Pick a carrier to assign
      const carrierOrg = Math.random() > 0.5 ? ironHorseOrg : midwestOrg;
      const carrierTrucks = trucksByOrg[carrierOrg._id.toString()] || [];
      if (carrierTrucks.length > 0) {
        const truck = carrierTrucks[Math.floor(Math.random() * carrierTrucks.length)];
        assignedTruckId = truck._id.toString();
        assignedDriverId = truck.assignedDriverId || carrierOrg.ownerId;
        assignedAt = bookedDate || postedDate || createdDate;
        bookingRequestCount = Math.floor(Math.random() * 5) + 1;
        confirmedBookingId = crypto.randomBytes(12).toString('hex');
      }
    }

    // Posted loads should have some booking requests
    if (status === 'posted' && Math.random() > 0.4) {
      bookingRequestCount = Math.floor(Math.random() * 4);
    }

    const shipper = shipperNames[Math.floor(Math.random() * shipperNames.length)];

    const load = await Load.create({
      orgId,
      createdBy: creator._id.toString(),
      shipperName: shipper,
      shipperPhone: genPhone(),
      shipperEmail: `shipping@${shipper.toLowerCase().replace(/\s+/g, '')}.com`,
      referenceNumber: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      origin: {
        address: `${Math.floor(100 + Math.random() * 9000)} ${['Industrial Blvd', 'Commerce Dr', 'Logistics Pkwy', 'Freight Ave', 'Warehouse Rd'][Math.floor(Math.random() * 5)]}`,
        city: oCity.city || route.origin.split(',')[0],
        state: oCity.state || route.origin.split(', ')[1],
        zip: oCity.zip,
        lat: oCity.lat,
        lng: oCity.lng,
        contactName: `${['Mike', 'Tom', 'Steve', 'John', 'Chris'][Math.floor(Math.random() * 5)]} ${['Anderson', 'Baker', 'Collins', 'Davis', 'Evans'][Math.floor(Math.random() * 5)]}`,
        contactPhone: genPhone(),
      },
      destination: {
        address: `${Math.floor(100 + Math.random() * 9000)} ${['Distribution Ct', 'Terminal Way', 'Dock St', 'Cargo Blvd', 'Delivery Ln'][Math.floor(Math.random() * 5)]}`,
        city: dCity.city || route.destination.split(',')[0],
        state: dCity.state || route.destination.split(', ')[1],
        zip: dCity.zip,
        lat: dCity.lat,
        lng: dCity.lng,
        contactName: `${['Robert', 'David', 'James', 'William', 'Richard'][Math.floor(Math.random() * 5)]} ${['Fisher', 'Garcia', 'Harris', 'Irwin', 'Jones'][Math.floor(Math.random() * 5)]}`,
        contactPhone: genPhone(),
      },
      pickupDate,
      deliveryDate,
      pickupWindow: { start: '08:00', end: '17:00' },
      deliveryWindow: { start: '08:00', end: '17:00' },
      weight: Math.floor(5000 + Math.random() * 40000),
      truckType: route.truckType,
      commodity: route.commodity,
      hazardousClass: ['Chemicals', 'Steel'].includes(route.commodity) ? 'Class 3' : null,
      temperatureMin: ['Fresh Produce', 'Pharmaceuticals'].includes(route.commodity) ? 34 : null,
      temperatureMax: ['Fresh Produce', 'Pharmaceuticals'].includes(route.commodity) ? 42 : null,
      rate: baseRate,
      rateType: 'per_mile',
      rateNegotiable: Math.random() > 0.5,
      specialRequirements:
        ['Hazmat', 'Temperature-controlled', 'Fragile', 'Oversized'][
          Math.floor(Math.random() * 4)
        ] === 'Oversized'
          ? 'Oversized load — pilot car required'
          : null,
      isPublic: status !== 'draft',
      requireVerifiedCarrier: Math.random() > 0.8,
      internalNotes: status === 'draft' ? 'Waiting on shipper confirmation' : null,
      status,
      statusHistory: history,
      assignedTruckId,
      assignedDriverId,
      assignedAt,
      bookingRequestCount,
      confirmedBookingId,
      estimatedDistance: distanceMiles,
      isArchived: status === 'archived',
      archivedAt:
        status === 'archived'
          ? new Date(
              deliveredDate
                ? deliveredDate.getTime() + 30 * ONE_DAY
                : createdDate.getTime() + 60 * ONE_DAY,
            )
          : null,
    });

    allLoads.push(load);
  }
  console.log(`   ✓ ${allLoads.length} loads created`);
  console.log(`     Draft: ${allLoads.filter((l) => l.status === 'draft').length}`);
  console.log(`     Posted: ${allLoads.filter((l) => l.status === 'posted').length}`);
  console.log(`     Booked: ${allLoads.filter((l) => l.status === 'booked').length}`);
  console.log(`     In Transit: ${allLoads.filter((l) => l.status === 'in_transit').length}`);
  console.log(`     Delivered: ${allLoads.filter((l) => l.status === 'delivered').length}`);
  console.log(`     Completed: ${allLoads.filter((l) => l.status === 'completed').length}`);
  console.log(`     Cancelled: ${allLoads.filter((l) => l.status === 'cancelled').length}`);
  console.log(`     Archived: ${allLoads.filter((l) => l.status === 'archived').length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOKING REQUESTS (on posted loads from carriers)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📋 Creating booking requests...');

  const postedLoads = allLoads.filter((l) => l.status === 'posted');
  const carrierOrgs = [ironHorseOrg, midwestOrg, daveOrg];
  let bookingCount = 0;

  for (const load of postedLoads.slice(0, 8)) {
    const carrierOrg = carrierOrgs[Math.floor(Math.random() * carrierOrgs.length)];
    const carrierTrucks = trucksByOrg[carrierOrg._id.toString()] || [];
    if (carrierTrucks.length === 0) continue;

    const truck = carrierTrucks[Math.floor(Math.random() * carrierTrucks.length)];
    const driverId = truck.assignedDriverId || carrierOrg.ownerId;

    // 1-2 booking requests per load
    const numRequests = Math.floor(Math.random() * 2) + 1;
    for (let r = 0; r < numRequests; r++) {
      const otherCarrier =
        carrierOrgs[(carrierOrgs.indexOf(carrierOrg) + r + 1) % carrierOrgs.length];
      const otherTrucks = trucksByOrg[otherCarrier._id.toString()] || [];
      if (otherTrucks.length === 0) continue;

      const brTruck = otherTrucks[Math.floor(Math.random() * otherTrucks.length)];
      const brDriver = brTruck.assignedDriverId || otherCarrier.ownerId;
      const proposedRate = Math.round(load.rate * (0.85 + Math.random() * 0.25));

      const brStatus = r === 0 && Math.random() > 0.4 ? 'accepted' : 'pending';

      const br = await BookingRequest.create({
        loadId: load._id.toString(),
        carrierOrgId: otherCarrier._id.toString(),
        carrierUserId: brDriver,
        truckId: brTruck._id.toString(),
        driverId: brDriver,
        proposedRate,
        status: brStatus,
        respondedBy: brStatus === 'accepted' ? load.createdBy : null,
        respondedAt:
          brStatus === 'accepted' ? new Date(NOW_MS - Math.random() * 3 * ONE_DAY) : null,
        denialReason: null,
        expiresAt: new Date(NOW_MS + 2 * ONE_DAY),
      });
      bookingCount++;

      // If accepted, update the load too
      if (brStatus === 'accepted') {
        await Load.findByIdAndUpdate(load._id, {
          $inc: { bookingRequestCount: 1 },
          confirmedBookingId: br._id.toString(),
          assignedTruckId: brTruck._id.toString(),
          assignedDriverId: brDriver,
          assignedAt: new Date(NOW - Math.random() * 3 * ONE_DAY),
          status: 'booked',
        });
      } else {
        await Load.findByIdAndUpdate(load._id, { $inc: { bookingRequestCount: 1 } });
      }
    }
  }
  console.log(`   ✓ ${bookingCount} booking requests created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // COUNTER OFFERS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🔄 Creating counter offers...');

  const pendingBRs = await BookingRequest.find({ status: 'pending' }).limit(5);
  let counterCount = 0;

  for (const br of pendingBRs) {
    const load = await Load.findById(br.loadId);
    if (!load) continue;

    // Broker counters carrier's offer
    const counterRate = Math.round((br.proposedRate || load.rate) * 0.92);
    await CounterOffer.create({
      loadId: br.loadId.toString(),
      bookingRequestId: br._id.toString(),
      offeredBy: load.createdBy,
      offeredTo: br.carrierUserId,
      proposedRate: counterRate,
      originalRate: br.proposedRate || load.rate,
      note: 'Can you meet this rate? We have multiple carriers interested.',
      status: 'pending',
      direction: 'broker_to_carrier',
      expiresAt: new Date(NOW_MS + 24 * 60 * 60 * 1000),
    });
    counterCount++;

    // Update booking request to counter_offer status
    br.status = 'counter_offer';
    await br.save();
  }
  console.log(`   ✓ ${counterCount} counter offers created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVED SEARCHES & PREFERRED LANES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🔍 Creating saved searches & preferred lanes...');

  const SavedSearch = loadsConn.model(
    'SavedSearch',
    new mongoose.Schema(
      {
        userId: { type: String, required: true },
        name: { type: String, required: true },
        filters: { type: mongoose.Schema.Types.Mixed, default: {} },
        alertEnabled: { type: Boolean, default: false },
        alertChannels: { type: [String], default: [] },
      },
      { timestamps: true },
    ),
    'saved_searches',
  );

  const PreferredLane = loadsConn.model(
    'PreferredLane',
    new mongoose.Schema(
      {
        userId: { type: String, required: true },
        originState: { type: String, required: true },
        destinationState: { type: String, required: true },
        minRatePerMile: { type: Number, default: null },
        minRatePerTrip: { type: Number, default: null },
        maxDistance: { type: Number, default: null },
        truckTypes: { type: [String], default: [] },
        alertEnabled: { type: Boolean, default: true },
      },
      { timestamps: true },
    ),
    'preferred_lanes',
  );

  const carrierUsers = users.filter((u) =>
    ['carrier', 'independent_driver', 'company_driver'].includes(u.role),
  );

  const savedSearchDefs = [
    {
      name: 'West Coast Dry Vans',
      filters: { origin: { state: 'CA' }, truckType: 'dry_van', minRate: 2000 },
    },
    {
      name: 'Reefer Loads Midwest',
      filters: { truckType: 'reefer', minRate: 2500, minWeight: 10000 },
    },
    {
      name: 'Flatbed Southeast',
      filters: { origin: { state: 'TX' }, truckType: 'flatbed', maxDistance: 800 },
    },
    {
      name: 'High Value West Coast',
      filters: { origin: { state: 'CA' }, truckType: 'dry_van', minRate: 3000 },
    },
    { name: 'Short Haul Midwest', filters: { truckType: 'dry_van', maxDistance: 500 } },
    {
      name: 'Heavy Haul Long Distance',
      filters: { truckType: 'heavy_haul', minRate: 4000, minWeight: 30000 },
    },
  ];

  for (const def of savedSearchDefs) {
    const user = carrierUsers[Math.floor(Math.random() * carrierUsers.length)];
    await SavedSearch.create({
      userId: user._id.toString(),
      name: def.name,
      filters: def.filters,
      alertEnabled: Math.random() > 0.5,
      alertChannels: ['push', 'email'].slice(0, Math.floor(Math.random() * 2) + 1),
    });
  }
  console.log(`   ✓ ${savedSearchDefs.length} saved searches created`);

  const laneDefs = [
    { origin: 'CA', dest: 'TX', minRatePerMile: 2.5 },
    { origin: 'TX', dest: 'IL', minRatePerMile: 2.25 },
    { origin: 'GA', dest: 'FL', minRatePerMile: 2.0 },
    { origin: 'IL', dest: 'NY', minRatePerMile: 2.75 },
    { origin: 'WA', dest: 'CA', minRatePerMile: 2.1 },
    { origin: 'IN', dest: 'OH', minRatePerMile: 1.9, maxDistance: 400 },
    { origin: 'TN', dest: 'TX', minRatePerMile: 2.2 },
    { origin: 'MO', dest: 'CO', minRatePerMile: 2.3 },
  ];

  for (const def of laneDefs) {
    const user = carrierUsers[Math.floor(Math.random() * carrierUsers.length)];
    await PreferredLane.create({
      userId: user._id.toString(),
      originState: def.origin,
      destinationState: def.dest,
      minRatePerMile: def.minRatePerMile,
      maxDistance: def.maxDistance || null,
      truckTypes: ['dry_van', 'reefer'].slice(0, Math.floor(Math.random() * 2) + 1),
      alertEnabled: true,
    });
  }
  console.log(`   ✓ ${laneDefs.length} preferred lanes created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60));
  console.log('🌱 SEED COMPLETE');
  console.log('='.repeat(60));
  console.log(`   Users:              ${users.length}`);
  console.log(`   Organizations:      ${orgs.length}`);
  console.log(
    `   Roles:              ${Object.values(orgRoles).reduce((sum, r) => sum + Object.keys(r).length, 0)}`,
  );
  console.log(`   Profiles:           ${allProfiles.length}`);
  console.log(`   Trucks:             ${allTrucks.length}`);
  console.log(`   Loads:              ${allLoads.length}`);
  console.log(`   Booking Requests:   ${bookingCount}`);
  console.log(`   Counter Offers:     ${counterCount}`);
  console.log(`   Saved Searches:     ${savedSearchDefs.length}`);
  console.log(`   Preferred Lanes:    ${laneDefs.length}`);
  console.log(`   Compliance Records: ${await Compliance.countDocuments()}`);
  console.log(`   Pending Invites:    ${await Invite.countDocuments({ status: 'pending' })}`);
  console.log('\n🔑 All passwords: Demo@123');
  console.log('📧 Admin login: admin@flowfreight.com');
  console.log('🚛 Broker: sarah.chen@summitlogistics.com');
  console.log('🚛 Carrier: robert.johnson@ironhorse.com');
  console.log('🚛 Driver: dave.trucking@gmail.com');
  console.log('='.repeat(60) + '\n');

  // Close connections
  await Promise.all([authConn.close(), usersConn.close(), fleetConn.close(), loadsConn.close()]);

  console.log('✅ Done. Database connections closed.\n');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
