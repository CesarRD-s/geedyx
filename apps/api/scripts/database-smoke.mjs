import { randomUUID } from 'node:crypto';

const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
const smokeId = randomUUID();
const ownerEmail = `ci-owner-${smokeId}@example.com`;
const ownerPassword = `CiOnly-${smokeId}!A1`;
const idempotencyKey = `ci-smoke-${smokeId}`;
const cookies = new Map();

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function request(path, options = {}, cookieStore = cookies) {
  const headers = {
    ...(options.headers ?? {}),
  };
  if (cookieStore.size > 0) {
    headers.Cookie = [...cookieStore.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(5_000),
  });
  for (const setCookie of response.headers.getSetCookie()) {
    const [pair] = setCookie.split(';', 1);
    const separator = pair.indexOf('=');
    if (separator < 0) continue;

    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (!value) cookieStore.delete(name);
    else cookieStore.set(name, value);
  }
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

  const ownerAfterCompletion = await request('/api/v1/setup/owner', {
    body: JSON.stringify({
      displayName: 'Blocked Owner',
      email: `blocked-${smokeId}@example.com`,
      password: ownerPassword,
      passwordConfirmation: ownerPassword,
    }),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `completed-installation-${smokeId}`,
    },
    method: 'POST',
  });
  assertStatus(ownerAfterCompletion, 409, 'Owner creation after completion');
  assertCondition(
    ownerAfterCompletion.body?.code === 'INSTALLATION_COMPLETED',
    'Owner creation after completion must return INSTALLATION_COMPLETED.',
  );

  const csrf = await request('/api/v1/auth/csrf');
  assertStatus(csrf, 200, 'CSRF token creation');
  const csrfToken = csrf.body?.data?.token;
  assertCondition(
    typeof csrfToken === 'string' && csrfToken.length >= 32,
    'CSRF token must be returned to the client.',
  );

  const missingCsrf = await request('/api/v1/auth/login', {
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  assertStatus(missingCsrf, 403, 'Login without CSRF');
  assertCondition(
    missingCsrf.body?.code === 'CSRF_INVALID',
    'Login without CSRF must return CSRF_INVALID.',
  );

  const login = await request('/api/v1/auth/login', {
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'POST',
  });
  assertStatus(login, 200, 'Owner login');
  assertCondition(
    login.body?.data?.user?.email === ownerEmail,
    'Owner login must return the authenticated user.',
  );

  const currentSession = await request('/api/v1/auth/me');
  assertStatus(currentSession, 200, 'Current session');
  assertCondition(
    currentSession.body?.data?.user?.email === ownerEmail,
    'Current session must resolve the logged-in owner.',
  );
  assertCondition(
    currentSession.body?.data?.expiresAt === login.body?.data?.expiresAt,
    'Reading the current session must not extend its idle expiration.',
  );

  const ownerSelfPasswordReset = await request(
    `/api/v1/users/${currentSession.body.data.user.id}/temporary-password`,
    {
      body: JSON.stringify({ reason: 'Owner recovery test' }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'POST',
    },
  );
  assertStatus(ownerSelfPasswordReset, 409, 'Owner self-reset');
  assertCondition(
    ownerSelfPasswordReset.body?.code === 'SELF_TEMPORARY_PASSWORD_NOT_ALLOWED',
    'An Owner must use the normal password change flow for their own account.',
  );

  const usersBefore = await request('/api/v1/users');
  assertStatus(usersBefore, 200, 'User list');
  assertCondition(
    usersBefore.body?.data?.users?.some((user) => user.email === ownerEmail),
    'User list must include the authenticated owner.',
  );

  const roles = await request('/api/v1/users/roles');
  assertStatus(roles, 200, 'System roles list');
  assertCondition(
    ['OWNER', 'ADMIN', 'USER'].every((code) =>
      roles.body?.data?.roles?.some((role) => role.code === code),
    ),
    'Installation must create the three system roles.',
  );
  assertCondition(
    roles.body?.data?.permissions?.some(
      (permission) => permission.code === 'products.manage' && permission.assignable,
    ),
    'The role catalog must expose assignable product actions.',
  );
  assertCondition(
    !roles.body?.data?.permissions?.some((permission) =>
      permission.code.startsWith('sales.'),
    ),
    'Unavailable sales actions must stay out of the role editor.',
  );

  const customRoleName = `CI Catalog Profile ${smokeId}`;
  const customRole = await request('/api/v1/users/roles', {
    body: JSON.stringify({
      description: 'Smoke profile for catalog access',
      name: customRoleName,
      permissionCodes: ['products.read', 'products.manage'],
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'POST',
  });
  assertStatus(customRole, 201, 'Custom access profile creation');
  assertCondition(
    customRole.body?.data?.name === customRoleName &&
      customRole.body?.data?.permissions?.includes('products.manage'),
    'A custom profile must persist its name and selected product actions.',
  );

  const duplicateRole = await request('/api/v1/users/roles', {
    body: JSON.stringify({
      description: 'Duplicate profile name',
      name: customRoleName.toLowerCase(),
      permissionCodes: ['products.read'],
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'POST',
  });
  assertStatus(duplicateRole, 409, 'Case-insensitive duplicate profile name');
  assertCondition(
    duplicateRole.body?.code === 'ROLE_NAME_ALREADY_EXISTS',
    'Profile names must be unique regardless of letter casing.',
  );

  const updatedRoleName = `${customRoleName} Updated`;
  const updatedRole = await request(`/api/v1/users/roles/${customRole.body.data.id}`, {
    body: JSON.stringify({
      description: 'Updated smoke profile for catalog access',
      name: updatedRoleName,
      permissionCodes: ['products.read', 'products.manage'],
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'PATCH',
  });
  assertStatus(updatedRole, 200, 'Custom access profile update');
  assertCondition(
    updatedRole.body?.data?.name === updatedRoleName &&
      updatedRole.body?.data?.description ===
        'Updated smoke profile for catalog access',
    'A custom profile must persist its updated name and description.',
  );

  const invalidCustomRole = await request('/api/v1/users/roles', {
    body: JSON.stringify({
      description: 'This profile must not be created',
      name: `CI Escalation ${smokeId}`,
      permissionCodes: ['roles.manage'],
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'POST',
  });
  assertStatus(invalidCustomRole, 400, 'Role-management escalation rejection');
  assertCondition(
    invalidCustomRole.body?.code === 'PERMISSION_NOT_AVAILABLE',
    'A custom profile must not grant role-management access.',
  );

  const configurationBefore = await request('/api/v1/configuration');
  assertStatus(configurationBefore, 200, 'Configuration read');
  assertCondition(
    configurationBefore.body?.data?.isComplete === false,
    'A new company must start with pending configuration.',
  );

  const invalidTimeZone = await request('/api/v1/configuration', {
    body: JSON.stringify({ timeZone: 'Not/A-Timezone' }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'PATCH',
  });
  assertStatus(invalidTimeZone, 400, 'Invalid global timezone');
  assertCondition(
    invalidTimeZone.body?.code === 'INVALID_TIME_ZONE',
    'Invalid global timezone must be rejected before persistence.',
  );

  const configurationUpdate = await request('/api/v1/configuration', {
    body: JSON.stringify({
      country: 'Honduras',
      currency: 'hnl',
      name: 'Geedyx Smoke Company',
      timeZone: 'America/Tegucigalpa',
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'PATCH',
  });
  assertStatus(configurationUpdate, 200, 'Configuration update');
  assertCondition(
    configurationUpdate.body?.data?.isComplete === true &&
      configurationUpdate.body?.data?.currency === 'HNL',
    'Configuration update must normalize the currency and complete required values.',
  );

  const category = await request('/api/v1/products/categories', {
    body: JSON.stringify({ name: `Smoke category ${smokeId}` }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'POST',
  });
  assertStatus(category, 201, 'Category creation');

  const product = await request('/api/v1/products', {
    body: JSON.stringify({
      categoryId: category.body?.data?.id,
      priceCents: 12500,
      sku: `SMOKE-${smokeId}`,
      title: 'Smoke product',
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'POST',
  });
  assertStatus(product, 201, 'Product creation');
  assertCondition(
    product.body?.data?.variants?.[0]?.priceCents === 12500,
    'Product creation must persist its first variant and price.',
  );

  const audit = await request('/api/v1/audit?module=products');
  assertStatus(audit, 200, 'Audit query');
  assertCondition(
    audit.body?.data?.events?.some((event) => event.action === 'PRODUCT_CREATED'),
    'Audit query must include the product creation event.',
  );

  const managedUserEmail = `managed-${smokeId}@example.com`;
  const createUser = await request('/api/v1/users', {
    body: JSON.stringify({
      displayName: 'Managed User',
      email: managedUserEmail,
      roleCodes: [customRole.body.data.code, 'USER'],
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'POST',
  });
  assertStatus(createUser, 201, 'Managed user creation');
  assertCondition(
    createUser.body?.data?.user?.email === managedUserEmail &&
      createUser.body?.data?.user?.passwordChangeRequired === true &&
      typeof createUser.body?.data?.temporaryPassword === 'string' &&
      createUser.body.data.temporaryPassword.length >= 8 &&
      typeof createUser.body?.data?.temporaryPasswordExpiresAt === 'string' &&
      createUser.body?.data?.user?.roleNames?.includes(updatedRoleName) &&
      createUser.body?.data?.user?.roleNames?.includes('Usuario de consulta'),
    'Managed user creation must return a temporary password once.',
  );

  const combinedUserCookies = new Map();
  const combinedUserCsrf = await request('/api/v1/auth/csrf', {}, combinedUserCookies);
  const combinedRoleLogin = await request(
    '/api/v1/auth/login',
    {
      body: JSON.stringify({
        email: managedUserEmail,
        password: createUser.body.data.temporaryPassword,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': combinedUserCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    combinedUserCookies,
  );
  assertStatus(combinedRoleLogin, 200, 'Combined profile login');
  assertCondition(
    combinedRoleLogin.body?.data?.user?.permissions?.includes('dashboard.read') &&
      combinedRoleLogin.body?.data?.user?.permissions?.includes('products.manage'),
    'A user must receive the combined permissions from every assigned profile.',
  );

  const deleteAssignedRole = await request(
    `/api/v1/users/roles/${customRole.body.data.id}`,
    {
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      method: 'DELETE',
    },
  );
  assertStatus(deleteAssignedRole, 409, 'Assigned profile deletion rejection');
  assertCondition(
    deleteAssignedRole.body?.code === 'ROLE_IN_USE',
    'A profile assigned to an account must not be deleted.',
  );

  const assignedRole = await request(
    `/api/v1/users/${createUser.body.data.user.id}/roles`,
    {
      body: JSON.stringify({
        reason: 'Smoke role assignment',
        roleCodes: ['USER'],
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'PATCH',
    },
  );
  assertStatus(assignedRole, 200, 'Managed user role assignment');
  assertCondition(
    assignedRole.body?.data?.user?.roles?.includes('USER'),
    'Managed user role assignment must persist the USER role.',
  );

  const deleteUnusedRole = await request(
    `/api/v1/users/roles/${customRole.body.data.id}`,
    {
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      method: 'DELETE',
    },
  );
  assertStatus(deleteUnusedRole, 200, 'Unassigned custom profile deletion');
  assertCondition(
    deleteUnusedRole.body?.data?.deleted === true,
    'A custom profile can be deleted after it is removed from every account.',
  );

  const disabledUser = await request(
    `/api/v1/users/${createUser.body.data.user.id}/status`,
    {
      body: JSON.stringify({
        reason: 'Smoke status transition',
        status: 'DISABLED',
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'PATCH',
    },
  );
  assertStatus(disabledUser, 200, 'Managed user disable');
  assertCondition(
    disabledUser.body?.data?.user?.status === 'DISABLED',
    'Managed user status must become DISABLED.',
  );

  const enabledUser = await request(
    `/api/v1/users/${createUser.body.data.user.id}/status`,
    {
      body: JSON.stringify({
        reason: 'Smoke status transition',
        status: 'ACTIVE',
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'PATCH',
    },
  );
  assertStatus(enabledUser, 200, 'Managed user enable');

  const reissuedTemporaryPassword = await request(
    `/api/v1/users/${createUser.body.data.user.id}/temporary-password`,
    {
      body: JSON.stringify({ reason: 'Smoke temporary password rotation' }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'POST',
    },
  );
  assertStatus(reissuedTemporaryPassword, 201, 'Temporary password reissue');
  assertCondition(
    typeof reissuedTemporaryPassword.body?.data?.temporaryPassword === 'string',
    'Temporary password reissue must return a one-time password.',
  );

  const duplicateUser = await request('/api/v1/users', {
    body: JSON.stringify({
      displayName: 'Managed User Duplicate',
      email: managedUserEmail,
      roleCodes: ['USER'],
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'POST',
  });
  assertStatus(duplicateUser, 409, 'Duplicate managed user');
  assertCondition(
    duplicateUser.body?.code === 'USER_EMAIL_ALREADY_EXISTS',
    'Duplicate managed user must return USER_EMAIL_ALREADY_EXISTS.',
  );

  const managedUserCookies = new Map();
  const managedUserCsrf = await request('/api/v1/auth/csrf', {}, managedUserCookies);
  const temporaryLogin = await request(
    '/api/v1/auth/login',
    {
      body: JSON.stringify({
        email: managedUserEmail,
        password: reissuedTemporaryPassword.body.data.temporaryPassword,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': managedUserCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    managedUserCookies,
  );
  assertStatus(temporaryLogin, 200, 'Temporary password login');
  assertCondition(
    temporaryLogin.body?.data?.user?.passwordChangeRequired === true,
    'Temporary password login must require a password change.',
  );
  assertCondition(
    !['inventory.read', 'sales.read', 'reports.read'].some((permission) =>
      temporaryLogin.body?.data?.user?.permissions?.includes(permission),
    ),
    'The base User profile must not grant actions from future modules.',
  );

  const restrictedUserList = await request('/api/v1/users', {}, managedUserCookies);
  assertStatus(restrictedUserList, 403, 'Managed user permission check');
  assertCondition(
    restrictedUserList.body?.code === 'PASSWORD_CHANGE_REQUIRED',
    'A managed user must change the temporary password before accessing API routes.',
  );

  const restrictedPreferences = await request(
    '/api/v1/auth/preferences',
    {},
    managedUserCookies,
  );
  assertStatus(restrictedPreferences, 403, 'Pending password preference access');
  assertCondition(
    restrictedPreferences.body?.code === 'PASSWORD_CHANGE_REQUIRED',
    'A pending password change must block authenticated read routes.',
  );

  const permanentPassword = `Managed-${smokeId}!A1`;
  const passwordChange = await request(
    '/api/v1/auth/password',
    {
      body: JSON.stringify({
        currentPassword: reissuedTemporaryPassword.body.data.temporaryPassword,
        newPassword: permanentPassword,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': managedUserCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    managedUserCookies,
  );
  assertStatus(passwordChange, 200, 'Mandatory password change');
  assertCondition(
    passwordChange.body?.data?.passwordChanged === true,
    'Mandatory password change must complete successfully.',
  );

  const managedUserSession = await request('/api/v1/auth/me', {}, managedUserCookies);
  assertStatus(managedUserSession, 200, 'Managed user session after password change');
  assertCondition(
    managedUserSession.body?.data?.user?.passwordChangeRequired === false,
    'Managed user session must leave restricted mode after password change.',
  );

  const secondUserPage = await request('/api/v1/users?page=2&pageSize=1');
  assertStatus(secondUserPage, 200, 'Second paginated user page');
  assertCondition(
    secondUserPage.body?.data?.users?.length === 1 &&
      secondUserPage.body?.data?.pagination?.page === 2 &&
      secondUserPage.body?.data?.pagination?.pageSize === 1,
    'The user list must honor page and pageSize parameters.',
  );

  const createReauthenticationOwner = await request('/api/v1/users', {
    body: JSON.stringify({
      displayName: 'Reauthentication Owner',
      email: `reauth-owner-${smokeId}@example.com`,
      roleCodes: ['USER'],
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'POST',
  });
  assertStatus(createReauthenticationOwner, 201, 'Reauthentication Owner creation');
  const reauthenticationOwnerId = createReauthenticationOwner.body.data.user.id;

  const assignSecondOwner = await request(
    `/api/v1/users/${reauthenticationOwnerId}/roles`,
    {
      body: JSON.stringify({
        currentPassword: ownerPassword,
        reason: 'Smoke Owner role assignment',
        roleCodes: ['OWNER'],
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'PATCH',
    },
  );
  assertStatus(assignSecondOwner, 200, 'Reauthenticated Owner role assignment');

  const ownerPasswordResetWithoutReauthentication = await request(
    `/api/v1/users/${reauthenticationOwnerId}/temporary-password`,
    {
      body: JSON.stringify({ reason: 'Smoke missing Owner reauthentication' }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'POST',
    },
  );
  assertStatus(
    ownerPasswordResetWithoutReauthentication,
    400,
    'Owner password reset without reauthentication',
  );
  assertCondition(
    ownerPasswordResetWithoutReauthentication.body?.code ===
      'REAUTHENTICATION_REQUIRED',
    'Owner password reset must require the actor current password.',
  );

  const ownerPasswordResetWithInvalidReauthentication = await request(
    `/api/v1/users/${reauthenticationOwnerId}/temporary-password`,
    {
      body: JSON.stringify({
        currentPassword: 'incorrect-current-password',
        reason: 'Smoke invalid Owner reauthentication',
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'POST',
    },
  );
  assertStatus(
    ownerPasswordResetWithInvalidReauthentication,
    401,
    'Owner password reset with invalid reauthentication',
  );
  assertCondition(
    ownerPasswordResetWithInvalidReauthentication.body?.code ===
      'REAUTHENTICATION_FAILED',
    'An invalid current password must not authorize an Owner password reset.',
  );

  const ownerPasswordResetWithReauthentication = await request(
    `/api/v1/users/${reauthenticationOwnerId}/temporary-password`,
    {
      body: JSON.stringify({
        currentPassword: ownerPassword,
        reason: 'Smoke valid Owner reauthentication',
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'POST',
    },
  );
  assertStatus(
    ownerPasswordResetWithReauthentication,
    201,
    'Owner password reset with reauthentication',
  );
  assertCondition(
    ownerPasswordResetWithReauthentication.body?.data?.user?.passwordChangeRequired ===
      true,
    'A reauthenticated Owner password reset must require a password change.',
  );

  const adminEmail = `managed-admin-${smokeId}@example.com`;
  const createAdmin = await request('/api/v1/users', {
    body: JSON.stringify({
      displayName: 'Managed Admin',
      email: adminEmail,
      roleCodes: ['USER'],
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    method: 'POST',
  });
  assertStatus(createAdmin, 201, 'Managed Admin creation');

  const assignAdminRole = await request(
    `/api/v1/users/${createAdmin.body.data.user.id}/roles`,
    {
      body: JSON.stringify({
        reason: 'Smoke Admin role assignment',
        roleCodes: ['ADMIN'],
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'PATCH',
    },
  );
  assertStatus(assignAdminRole, 200, 'Managed Admin role assignment');

  const adminCookies = new Map();
  const adminCsrf = await request('/api/v1/auth/csrf', {}, adminCookies);
  const adminTemporaryLogin = await request(
    '/api/v1/auth/login',
    {
      body: JSON.stringify({
        email: adminEmail,
        password: createAdmin.body.data.temporaryPassword,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': adminCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    adminCookies,
  );
  assertStatus(adminTemporaryLogin, 200, 'Managed Admin temporary login');

  const adminPermanentPassword = `Admin-${smokeId}!A1`;
  const adminPasswordChange = await request(
    '/api/v1/auth/password',
    {
      body: JSON.stringify({
        currentPassword: createAdmin.body.data.temporaryPassword,
        newPassword: adminPermanentPassword,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': adminCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    adminCookies,
  );
  assertStatus(adminPasswordChange, 200, 'Managed Admin password change');

  const adminOwnerPasswordReset = await request(
    `/api/v1/users/${currentSession.body.data.user.id}/temporary-password`,
    {
      body: JSON.stringify({
        currentPassword: adminPermanentPassword,
        reason: 'Admin Owner reset attempt',
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': adminCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    adminCookies,
  );
  assertStatus(adminOwnerPasswordReset, 403, 'Admin Owner password reset denial');
  assertCondition(
    adminOwnerPasswordReset.body?.code === 'OWNER_ROLE_REQUIRES_OWNER',
    'An Admin must not reset an Owner password even after reauthentication.',
  );

  const managedSessions = await request(
    `/api/v1/users/${createUser.body.data.user.id}/sessions`,
  );
  assertStatus(managedSessions, 200, 'Managed user session list');
  assertCondition(
    managedSessions.body?.data?.sessions?.length >= 1,
    'An authenticated managed user must have an active session.',
  );

  const managedSessionId = managedSessions.body.data.sessions[0].id;
  const managedSessionRevocation = await request(
    `/api/v1/users/${createUser.body.data.user.id}/sessions/${managedSessionId}/revoke`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      method: 'POST',
    },
  );
  assertStatus(managedSessionRevocation, 200, 'Managed user session revocation');

  const managedSessionAfterRevocation = await request(
    '/api/v1/auth/me',
    {},
    managedUserCookies,
  );
  assertStatus(
    managedSessionAfterRevocation,
    401,
    'Managed user session after administrative revocation',
  );

  const oldPasswordCookies = new Map();
  const oldPasswordCsrf = await request('/api/v1/auth/csrf', {}, oldPasswordCookies);
  const oldPasswordLogin = await request(
    '/api/v1/auth/login',
    {
      body: JSON.stringify({
        email: managedUserEmail,
        password: reissuedTemporaryPassword.body.data.temporaryPassword,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': oldPasswordCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    oldPasswordCookies,
  );
  assertStatus(oldPasswordLogin, 401, 'Expired temporary password after change');

  const additionalSessions = [];
  for (let sessionIndex = 0; sessionIndex < 4; sessionIndex += 1) {
    const sessionCookies = new Map();
    const sessionCsrf = await request('/api/v1/auth/csrf', {}, sessionCookies);
    assertStatus(sessionCsrf, 200, `Additional session ${sessionIndex + 1} CSRF`);
    const additionalLogin = await request(
      '/api/v1/auth/login',
      {
        body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': sessionCsrf.body?.data?.token,
        },
        method: 'POST',
      },
      sessionCookies,
    );
    assertStatus(additionalLogin, 200, `Additional session ${sessionIndex + 1}`);
    additionalSessions.push(sessionCookies);
  }

  const sessionLimitAttempts = await Promise.all(
    [0, 1].map(async () => {
      const cookieStore = new Map();
      const csrf = await request('/api/v1/auth/csrf', {}, cookieStore);
      const login = await request(
        '/api/v1/auth/login',
        {
          body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf.body?.data?.token,
          },
          method: 'POST',
        },
        cookieStore,
      );
      return { cookieStore, csrf, login };
    }),
  );
  for (const [index, attempt] of sessionLimitAttempts.entries()) {
    assertStatus(attempt.login, 409, `Concurrent session limit response ${index + 1}`);
    assertCondition(
      attempt.login.body?.code === 'SESSION_LIMIT_REACHED',
      'Session limit must return SESSION_LIMIT_REACHED.',
    );
    assertCondition(
      attempt.login.body?.sessionManagement?.sessions?.length === 5 &&
        typeof attempt.login.body?.sessionManagement?.token === 'string',
      'Session limit must return a restricted session management challenge.',
    );
  }

  const limitedSessionCookies = sessionLimitAttempts[0].cookieStore;
  const limitedCsrf = sessionLimitAttempts[0].csrf;
  const limitedLogin = sessionLimitAttempts[0].login;

  const sessionToRevoke = limitedLogin.body.sessionManagement.sessions[0];
  const revokedSession = await request(
    '/api/v1/auth/sessions/revoke',
    {
      body: JSON.stringify({
        sessionId: sessionToRevoke.id,
        sessionManagementToken: limitedLogin.body.sessionManagement.token,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': limitedCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    limitedSessionCookies,
  );
  assertStatus(revokedSession, 200, 'Session revocation from limit flow');

  const loginAfterRevocation = await request(
    '/api/v1/auth/login',
    {
      body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': limitedCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    limitedSessionCookies,
  );
  assertStatus(loginAfterRevocation, 200, 'Login after session revocation');

  const missingLogoutCsrf = await request(
    '/api/v1/auth/logout',
    {
      method: 'POST',
    },
    limitedSessionCookies,
  );
  assertStatus(missingLogoutCsrf, 403, 'Logout without CSRF');

  const logout = await request(
    '/api/v1/auth/logout',
    {
      headers: {
        'X-CSRF-Token': limitedCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    limitedSessionCookies,
  );
  assertStatus(logout, 200, 'Owner logout');
  assertCondition(
    logout.body?.data?.loggedOut === true,
    'Owner logout must revoke the current session.',
  );

  const sessionAfterLogout = await request(
    '/api/v1/auth/me',
    {},
    limitedSessionCookies,
  );
  assertStatus(sessionAfterLogout, 401, 'Session after logout');

  const concurrentFailures = await Promise.all(
    [0, 1, 2, 3, 4].map(async () => {
      const cookieStore = new Map();
      const csrf = await request('/api/v1/auth/csrf', {}, cookieStore);
      return request(
        '/api/v1/auth/login',
        {
          body: JSON.stringify({
            email: ownerEmail,
            password: `${ownerPassword}-invalid`,
          }),
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf.body?.data?.token,
          },
          method: 'POST',
        },
        cookieStore,
      );
    }),
  );
  for (const [index, failure] of concurrentFailures.entries()) {
    assertStatus(failure, 401, `Concurrent invalid login ${index + 1}`);
  }

  const lockedLoginCookies = new Map();
  const lockedLoginCsrf = await request('/api/v1/auth/csrf', {}, lockedLoginCookies);
  const lockedLogin = await request(
    '/api/v1/auth/login',
    {
      body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': lockedLoginCsrf.body?.data?.token,
      },
      method: 'POST',
    },
    lockedLoginCookies,
  );
  assertStatus(lockedLogin, 401, 'Login after concurrent failure threshold');

  console.log('Database and API smoke test passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
