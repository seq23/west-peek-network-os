import fs from 'node:fs';
import path from 'node:path';
import { expect, request as playwrightRequest, test } from '@playwright/test';

const liveEnabled = () => process.env.TIER4_ULTIMATE_LIVE_PROOF === '1';

const storageConfigured = () =>
  Boolean(
    process.env.TIER4_AUTHENTICATED_STORAGE_STATE ||
      process.env.PLAYWRIGHT_STORAGE_STATE
  );

const controlledUnavailableAllowed = () =>
  process.env.TIER4_ALLOW_CONTROLLED_UNAVAILABLE === '1';

function requireRunId() {
  const runId = process.env.WEST_PEEK_E2E_RUN_ID;

  expect(
    runId,
    'WEST_PEEK_E2E_RUN_ID is required for Tier 4 live workflows.'
  ).toBeTruthy();

  return runId as string;
}

function unique(prefix: string) {
  return `${prefix}-${requireRunId()}-${Date.now()}`;
}

async function snapshot(request: {
  get: (
    url: string
  ) => Promise<{
    ok: () => boolean;
    text: () => Promise<string>;
    json: () => Promise<unknown>;
  }>;
}) {
  const response = await request.get('/api/sheets/snapshot?fresh=1');

  expect(response.ok(), await response.text()).toBeTruthy();

  const payload = (await response.json()) as {
    ok?: boolean;
    data?: Record<string, Array<Record<string, unknown>>>;
  };

  expect(payload.ok).toBeTruthy();

  return payload.data || {};
}

function assertNoSecrets(value: unknown) {
  expect(JSON.stringify(value)).not.toMatch(
    /BEGIN PRIVATE KEY|client_secret|encrypted_payload|ya29\.|sk-ant-|Bearer\s+[A-Za-z0-9._-]+/i
  );
}

test.describe('Tier 4 deployed live workflows', () => {
  test.beforeEach(() => {
    test.skip(
      !liveEnabled(),
      'TIER4_ULTIMATE_LIVE_PROOF=1 is required.'
    );

    test.skip(
      !storageConfigured(),
      'Authenticated Playwright storage state is required.'
    );

    expect(
      process.env.PLAYWRIGHT_BASE_URL?.startsWith('https://'),
      'PLAYWRIGHT_BASE_URL must be an explicit deployed HTTPS URL.'
    ).toBeTruthy();
  });

  test('google sheets read write readback live', async ({ request }) => {
    const marker = unique('tier4-sheets');
    const email = `${marker}@example.com`;

    const create = await request.post('/api/contacts/create', {
      data: {
        full_name: `Tier 4 Sheets ${marker}`,
        email,
        company: 'Tier 4 Sheets Proof',
        relationship_owner: 'Sequoia',
        priority: 'Normal',
        context_summary: `Google Sheets live read/write/readback proof ${marker}`
      }
    });

    expect(create.ok(), await create.text()).toBeTruthy();

    const data = await snapshot(request);
    const contacts = data.contacts || [];

    const contact = contacts.find(
      (row) => String(row.email || '') === email
    );

    expect(contact).toBeTruthy();
    expect(String(contact?.context_summary || '')).toContain(marker);

    assertNoSecrets(data);
  });

  test('contact workflow live', async ({ request }) => {
    const marker = unique('tier4-contact');
    const email = `${marker}@example.com`;

    const create = await request.post('/api/contacts/create', {
      data: {
        full_name: `Tier 4 Contact ${marker}`,
        email,
        company: 'Tier 4 Contact Proof',
        person_type: 'founder',
        deal_flow_prospect: 'yes',
        relationship_owner: 'Sequoia',
        priority: 'High',
        context_summary: `Contact create, search, and duplicate proof ${marker}`
      }
    });

    expect(create.ok(), await create.text()).toBeTruthy();

    const created = await create.json();

    expect(created.contact.email).toBe(email);

    const duplicate = await request.post('/api/contacts/create', {
      data: {
        full_name: `Tier 4 Duplicate ${marker}`,
        email,
        company: 'Duplicate Proof'
      }
    });

    expect(duplicate.status()).toBe(409);

    const data = await snapshot(request);
    const contacts = data.contacts || [];

    const rows = contacts.filter(
      (row) => String(row.email || '') === email
    );

    expect(rows).toHaveLength(1);
    expect(String(rows[0].status || '')).toBe('active');
  });

  test('human review workflow live', async ({ request }) => {
    const marker = unique('tier4-review');

    const existingEmail = `${marker}-existing@example.com`;

    const existingResponse = await request.post('/api/contacts/create', {
      data: {
        full_name: `Tier 4 Existing ${marker}`,
        email: existingEmail,
        company: 'Tier 4 Existing Contact',
        context_summary: marker
      }
    });

    expect(
      existingResponse.ok(),
      await existingResponse.text()
    ).toBeTruthy();

    const existingPayload = await existingResponse.json();
    const existingContact = existingPayload.contact;

    const createIntake = async (suffix: string, email: string) => {
      const response = await request.post('/api/intake/create', {
        data: {
          raw_text: [
            '#wpnetwork',
            `Name: Tier 4 ${suffix} ${marker}`,
            `Email: ${email}`,
            'Company: Tier 4 Review Proof',
            `Context: ${marker} ${suffix}`,
            'Owner: Sequoia'
          ].join('\n')
        }
      });

      expect(response.ok(), await response.text()).toBeTruthy();

      const payload = await response.json();

      return payload.intake;
    };

    const convertIntake = await createIntake(
      'Convert',
      `${marker}-convert@example.com`
    );

    const convert = await request.post('/api/intake/review', {
      data: {
        intake_id: convertIntake.intake_id,
        action: 'convert'
      }
    });

    expect(convert.ok(), await convert.text()).toBeTruthy();

    const convertPayload = await convert.json();

    expect(convertPayload.execution_allowed).toBe(false);
    expect(convertPayload.contact?.contact_id).toBeTruthy();

    const attachIntake = await createIntake(
      'Attach',
      `${marker}-attach@example.com`
    );

    const attach = await request.post('/api/intake/review', {
      data: {
        intake_id: attachIntake.intake_id,
        action: 'attach',
        attached_contact_id: existingContact.contact_id
      }
    });

    expect(attach.ok(), await attach.text()).toBeTruthy();

    const dismissIntake = await createIntake(
      'Dismiss',
      `${marker}-dismiss@example.com`
    );

    const dismiss = await request.post('/api/intake/review', {
      data: {
        intake_id: dismissIntake.intake_id,
        action: 'dismiss',
        dismiss_reason: `Tier 4 dismissal ${marker}`
      }
    });

    expect(dismiss.ok(), await dismiss.text()).toBeTruthy();

    const data = await snapshot(request);
    const intakeRows = data.intake_queue || [];

    const byId = new Map(
      intakeRows.map((row) => [String(row.intake_id || ''), row])
    );

    expect(
      String(
        byId.get(String(convertIntake.intake_id))?.review_status || ''
      )
    ).toBe('converted');

    expect(
      String(
        byId.get(String(attachIntake.intake_id))?.review_status || ''
      )
    ).toBe('attached');

    expect(
      String(
        byId.get(String(dismissIntake.intake_id))?.review_status || ''
      )
    ).toBe('dismissed');

    expect(
      String(
        byId.get(String(attachIntake.intake_id))?.attached_contact_id || ''
      )
    ).toBe(String(existingContact.contact_id));
  });

  test('relationship touch workflow live', async ({ request }) => {
    const marker = unique('tier4-touch');
    const approvedId = `approval-approved-${marker}`;
    const rejectedId = `approval-rejected-${marker}`;
    const touchId = `touch-${marker}`;

    const approve = await request.post('/api/approvals/decision', {
      data: {
        approval_id: approvedId,
        decision: 'approve',
        approval_type: 'relationship_touch',
        source_entity_id: touchId
      }
    });

    expect(approve.ok(), await approve.text()).toBeTruthy();

    const reject = await request.post('/api/approvals/decision', {
      data: {
        approval_id: rejectedId,
        decision: 'reject',
        approval_type: 'relationship_touch',
        source_entity_id: touchId
      }
    });

    expect(reject.ok(), await reject.text()).toBeTruthy();

    const fulfillment = await request.post(
      '/api/touches/fulfillment/update',
      {
        data: {
          touch_id: touchId,
          recipient_name: `Tier 4 Touch ${marker}`,
          recipient_email: `${marker}@example.com`,
          company: 'Tier 4 Touch Proof',
          owner: 'Sequoia',
          reason: `Relationship touch proof ${marker}`,
          priority: 'Normal',
          method: 'handwritten_note',
          fulfillment_mode: 'self',
          fulfillment_status: 'will_do_myself',
          fulfillment_notes:
            `No automatic send, payment, order, or vendor execution ${marker}`
        }
      }
    );

    expect(
      fulfillment.ok(),
      await fulfillment.text()
    ).toBeTruthy();

    const fulfillmentPayload = await fulfillment.json();

    expect(fulfillmentPayload.execution_allowed).toBe(false);
    expect(fulfillmentPayload.execution_status).toBe(
      'not_executed_by_app'
    );

    const data = await snapshot(request);
    const approvals = data.approvals || [];
    const touches = data.relationship_touches || [];

    expect(
      approvals.find(
        (row) => String(row.approval_id || '') === approvedId
      )?.status
    ).toBe('approved');

    expect(
      approvals.find(
        (row) => String(row.approval_id || '') === rejectedId
      )?.status
    ).toBe('rejected');

    const touch = touches.find(
      (row) => String(row.touch_id || '') === touchId
    );

    expect(touch).toBeTruthy();
    expect(String(touch?.execution_allowed || '')).not.toBe('true');
    expect(String(touch?.fulfillment_mode || '')).toBe('self');
  });

  test('public event live', async ({ browser, request }) => {
    const marker = unique('tier4-event');
    const email = `${marker}@example.com`;

    const eventResponse = await request.post('/api/events/create', {
      data: {
        event_name: `Tier 4 Event ${marker}`,
        event_date: new Date().toISOString().slice(0, 10),
        location: 'Memphis',
        notes: marker,
        public_form_enabled: true
      }
    });

    expect(
      eventResponse.ok(),
      await eventResponse.text()
    ).toBeTruthy();

    const eventPayload = await eventResponse.json();
    const publicFormUrl = String(eventPayload.public_form_url || '');

    expect(publicFormUrl).toMatch(/^\/e\//);

    const anonymous = await playwrightRequest.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL,
      storageState: {
        cookies: [],
        origins: []
      }
    });

    try {
      const invalid = await anonymous.post(publicFormUrl, {
        form: {}
      });

      expect(invalid.status()).toBe(400);
      expect(await invalid.text()).toMatch(
        /Name and email are required/i
      );

      const valid = await anonymous.post(publicFormUrl, {
        form: {
          name: `Tier 4 Event Guest ${marker}`,
          email,
          company: 'Tier 4 Event Capital',
          title: 'Partner',
          interest: `Public event review-only proof ${marker}`,
          consent_follow_up: 'on'
        }
      });

      expect(valid.ok(), await valid.text()).toBeTruthy();

      const validText = await valid.text();

      expect(validText).toMatch(/Thanks|received|you’re in/i);
      expect(validText).not.toMatch(
        /email sent|automatic outreach|intro sent/i
      );
    } finally {
      await anonymous.dispose();
    }

    const mobile = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL,
      storageState: {
        cookies: [],
        origins: []
      },
      viewport: {
        width: 390,
        height: 844
      }
    });

    try {
      const page = await mobile.newPage();

      await page.goto(publicFormUrl);

      await expect(
        page.getByRole('button', {
          name: /Submit to West Peek/i
        })
      ).toBeVisible();
    } finally {
      await mobile.close();
    }

    const data = await snapshot(request);
    const attendees = data.event_attendees || [];
    const intakeRows = data.intake_queue || [];

    expect(
      attendees.find(
        (row) => String(row.public_email || '') === email
      )
    ).toBeTruthy();

    const intake = intakeRows.find(
      (row) => String(row.parsed_email || '') === email
    );

    expect(intake).toBeTruthy();
    expect(String(intake?.execution_allowed || '')).not.toBe('true');
  });

  test('ai ocr voice live or controlled unavailable', async ({
    request
  }) => {
    const marker = unique('tier4-provider');

    const ai = await request.post('/api/ai/suggestions/create', {
      data: {
        raw_text: `Tier 4 AI relationship suggestion proof ${marker}`,
        source_entity_type: 'adhoc',
        source_entity_id: marker,
        suggestion_type: 'follow_up_recommendation'
      }
    });

    if (ai.ok()) {
      const payload = await ai.json();

      expect(payload.ok).toBeTruthy();
      expect(payload.provider).toBe('anthropic');
      expect(payload.execution_allowed).toBe(false);

      assertNoSecrets(payload);
    } else {
      const text = await ai.text();

      expect(controlledUnavailableAllowed(), text).toBeTruthy();
      expect([502, 503]).toContain(ai.status());

      assertNoSecrets(text);
    }

    const cardPath = path.join(
      process.cwd(),
      'tests/e2e/fixtures/card.png'
    );

    const ocr = await request.post('/api/intake/media/create', {
      multipart: {
        capture_type: 'business_card',
        context_note: `Tier 4 OCR proof ${marker}`,
        file: {
          name: 'card.png',
          mimeType: 'image/png',
          buffer: fs.readFileSync(cardPath)
        }
      }
    });

    if (ocr.ok()) {
      const payload = await ocr.json();

      expect(payload.ok).toBeTruthy();
      expect(payload.execution_allowed).toBe(false);

      assertNoSecrets(payload);
    } else {
      const text = await ocr.text();

      expect(controlledUnavailableAllowed(), text).toBeTruthy();
      expect([502, 503]).toContain(ocr.status());

      assertNoSecrets(text);
    }

    const voicePath = path.join(
      process.cwd(),
      'tests/e2e/fixtures/voice.webm'
    );

    const voice = await request.post('/api/intake/media/create', {
      multipart: {
        capture_type: 'voice_note',
        context_note: `Tier 4 voice proof ${marker}`,
        file: {
          name: 'voice.webm',
          mimeType: 'audio/webm',
          buffer: fs.readFileSync(voicePath)
        }
      }
    });

    if (voice.ok()) {
      const payload = await voice.json();

      expect(payload.ok).toBeTruthy();
      expect(payload.execution_allowed).toBe(false);

      assertNoSecrets(payload);
    } else {
      const text = await voice.text();

      expect(controlledUnavailableAllowed(), text).toBeTruthy();
      expect([502, 503]).toContain(voice.status());

      assertNoSecrets(text);
    }
  });

  test('auth boundary live', async () => {
    const anonymous = await playwrightRequest.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL,
      storageState: {
        cookies: [],
        origins: []
      }
    });

    try {
      const session = await anonymous.get('/api/session');

      expect([401, 403]).toContain(session.status());

      const provider = await anonymous.get(
        '/api/provider/status'
      );

      expect([401, 403]).toContain(provider.status());

      const sheets = await anonymous.get(
        '/api/sheets/snapshot'
      );

      expect([401, 403]).toContain(sheets.status());

      const health = await anonymous.get('/api/health');

      expect(
        health.ok(),
        await health.text()
      ).toBeTruthy();

      const oauthStart = await anonymous.get('/auth/google', {
        maxRedirects: 0
      });

      expect([301, 302, 303, 307, 308]).toContain(
        oauthStart.status()
      );

      assertNoSecrets(await session.text());
      assertNoSecrets(await provider.text());
      assertNoSecrets(await sheets.text());
    } finally {
      await anonymous.dispose();
    }
  });

  test('runtime context live', async ({ request }) => {
    const session = await request.get('/api/session');

    expect(
      session.ok(),
      await session.text()
    ).toBeTruthy();

    const sessionPayload = await session.json();

    expect(sessionPayload.authenticated).toBe(true);

    const oauth = await request.get('/api/oauth/status');

    expect(
      oauth.ok(),
      await oauth.text()
    ).toBeTruthy();

    const oauthPayload = await oauth.json();

    expect(oauthPayload.ok).toBeTruthy();

    const provider = await request.get(
      '/api/provider/status'
    );

    expect(
      provider.ok(),
      await provider.text()
    ).toBeTruthy();

    const providerPayload = await provider.json();

    expect(providerPayload.ok).toBeTruthy();

    expect(
      providerPayload.providers.google_oauth.status
    ).toBe('configured');

    expect(
      providerPayload.providers.google_sheets.status
    ).toBe('configured');

    expect(
      providerPayload.providers.pitch_lab.status
    ).toBe('configured');

    const data = await snapshot(request);

    expect(Array.isArray(data.contacts)).toBeTruthy();

    expect(
      Array.isArray(data.intake_queue)
    ).toBeTruthy();

    assertNoSecrets(sessionPayload);
    assertNoSecrets(oauthPayload);
    assertNoSecrets(providerPayload);
    assertNoSecrets(data);
  });
});
