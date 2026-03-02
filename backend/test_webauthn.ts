import { generateRegistrationOptions } from '@simplewebauthn/server';

async function test() {
    try {
        const options = await generateRegistrationOptions({
            rpName: 'Biometric Voting System',
            rpID: '10.90.135.110',
            userID: '0d48f766-0775-4ceb-acc1-aa344fcbb18f',
            userName: 'test@student.babcock.edu.ng',
            userDisplayName: 'Test User',
            attestationType: 'none',
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
            excludeCredentials: [],
        });
        console.log('SUCCESS');
    } catch (error) {
        console.error('ERROR OCCURRED:');
        console.error(error);
    }
}

test();
