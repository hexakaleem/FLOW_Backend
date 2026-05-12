const m = require('mongoose');
const U = (process.env.MONGO_URI || 'mongodb://localhost:27017') + '/flow_auth';

(async () => {
  const a = m.createConnection(U);
  await a.asPromise();
  const User = a.model('U', new m.Schema({}, { strict: false, collection: 'users' }));
  const u = await User.findOne({ email: 'broker@flow.com' });
  if (u) {
    console.log('Found: ' + u.email);
    console.log('Role: ' + u.role);
    console.log('Status: ' + u.status);
    console.log('Onboarding: ' + u.isOnboardingComplete);
    console.log('Hash prefix: ' + u.passwordHash?.substring(0, 30));
  } else {
    console.log('USER NOT FOUND in flow_auth.users');
  }
  a.close();
  process.exit();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
