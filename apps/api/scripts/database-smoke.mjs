import { randomUUID } from 'node:crypto';

const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
const smokeId = randomUUID();
const ownerEmail = `ci-owner-${smokeId}@example.com`;
const ownerPassword = `CiOnly-${smokeId}!A1`;
const idempotencyKey = `ci-smoke-${smokeId}`;

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    signal: AbortSignal.timeout(5_000),
  });
  const rawBody = await response.text();

  return {
    body: rawBody ? JSON.parse(rawBody) : undefined,
    response,
  };
}

function assertStatus(result, expectedStatus, operation) {
  if (result.response.status === expectedStatus) {
    return;
  }

  throw new Error(
    `${operation} expected HTTP ${expectedStatus} but received ` +
      `${result.response.status}: ${JSON.stringify(result.body)}`,
  );
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForApi() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const result = await request('/health/ready');

      if (result.response.ok) {
        return;
      }
    } catch {
      // The API may still be starting or the database may still be readying.
    }

    await sleep(1_000);
  }

  throw new Error('The API did not become ready within 30 seconds.');
}

async function run() {
  await waitForApi();

  const ready = await request('/health/ready');
  assertStatus(ready, 200, 'Database readiness');
  assertCondition(
    ready.body?.data?.dependencies?.database === 'up',
    'Database readiness did not report database=up.',
  );

  const initialStatus = await request('/api/v1/setup/status');
  assertStatus(initialStatus, 200, 'Initial setup status');
  assertCondition(
    initialStatus.body?.data?.installationStatus === 'PENDING',
    'Initial installation status must be PENDING.',
  );

  const invalidOwner = await request('/api/v1/setup/owner', {
    body: JSON.stringify({}),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  assertStatus(invalidOwner, 422, 'Invalid owner request');
  assertCondition(
    invalidOwner.body?.code === 'VALIDATION_ERROR',
    'Invalid owner request must return VALIDATION_ERROR.',
  );

  const ownerPayload = {
    displayName: 'CI Owner',
    email: ownerEmail,
    password: ownerPassword,
    passwordConfirmation: ownerPassword,
  };
  const createOwner = await request('/api/v1/setup/owner', {
    body: JSON.stringify(ownerPayload),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    method: 'POST',
  });
  assertStatus(createOwner, 201, 'Owner creation');
  assertCondition(
    createOwner.body?.data?.installationStatus === 'COMPLETED',
    'Owner creation must complete the installation.',
  );

  const replayOwner = await request('/api/v1/setup/owner', {
    body: JSON.stringify(ownerPayload),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    method: 'POST',
  });
  assertStatus(replayOwner, 201, 'Idempotent owner replay');
  assertCondition(
    replayOwner.body?.data?.owner?.id === createOwner.body?.data?.owner?.id,
    'Idempotent owner replay must return the original owner.',
  );

  const conflictingOwner = await request('/api/v1/setup/owner', {
    body: JSON.stringify({
      ...ownerPayload,
      displayName: 'Different Owner',
    }),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    method: 'POST',
  });
  assertStatus(conflictingOwner, 409, 'Conflicting idempotency request');
  assertCondition(
    conflictingOwner.body?.code === 'IDEMPOTENCY_KEY_REUSED',
    'Conflicting idempotency request must return IDEMPOTENCY_KEY_REUSED.',
  );

  const completedStatus = await request('/api/v1/setup/status');
  assertStatus(completedStatus, 200, 'Completed setup status');
  assertCondition(
    completedStatus.body?.data?.installationStatus === 'COMPLETED',
    'Completed installation status must be COMPLETED.',
  );

  console.log('Database and API smoke test passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
