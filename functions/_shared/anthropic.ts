export interface AnthropicEnv {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  ANTHROPIC_VISION_MODEL?: string;
  AI_PROVIDER?: string;
}

export interface RelationshipSuggestionInput {
  rawText: string;
  sourceEntityType: string;
  sourceEntityId: string;
  requestedBy: string;
}

export interface RelationshipSuggestionPayload {
  summary: string;
  suggested_follow_up: string;
  suggested_touch_method: string;
  suggested_priority: 'Low' | 'Normal' | 'High';
  suggested_tags: string[];
  confidence: 'low' | 'medium' | 'high';
  reasoning_summary: string;
  human_review_required: true;
  execution_allowed: false;
}

export interface IntakeExtractionPayload {
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  website: string;
  context: string;
  suggested_owner: 'Sequoia' | 'Scooter' | 'Unassigned';
  suggested_priority: 'Low' | 'Normal' | 'High';
  suggested_touch_method: string;
  missing_fields: string[];
  confidence: 'low' | 'medium' | 'high';
  raw_extracted_text: string;
  human_review_required: true;
  execution_allowed: false;
}

export interface ThankYouDraftPayload {
  card_title: string;
  card_message: string;
  email_subject: string;
  email_body: string;
  tone: string;
  confidence: 'low' | 'medium' | 'high';
  human_review_required: true;
  execution_allowed: false;
}

const DEFAULT_MODEL = 'claude-3-5-haiku-latest';
const DEFAULT_VISION_MODEL = 'claude-3-5-sonnet-latest';
const ANTHROPIC_VERSION = '2023-06-01';

export function assertAnthropicConfigured(env: AnthropicEnv) {
  if ((env.AI_PROVIDER || 'anthropic').toLowerCase() !== 'anthropic') {
    throw new Error('AI_PROVIDER must be anthropic for the Claude relationship assistant.');
  }
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured.');
}

export async function createRelationshipSuggestion(env: AnthropicEnv, input: RelationshipSuggestionInput): Promise<RelationshipSuggestionPayload> {
  const value = await callClaudeJson(env, {
    model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    maxTokens: 700,
    system: relationshipSystem(),
    content: [
      'Create one relationship review suggestion from this capture.',
      'Return JSON with exactly these keys:',
      'summary, suggested_follow_up, suggested_touch_method, suggested_priority, suggested_tags, confidence, reasoning_summary, human_review_required, execution_allowed.',
      'Rules: suggested_priority must be Low, Normal, or High. confidence must be low, medium, or high. human_review_required must be true. execution_allowed must be false.',
      `Source entity type: ${input.sourceEntityType}`,
      `Source entity id: ${input.sourceEntityId}`,
      `Requested by: ${input.requestedBy}`,
      'Raw capture:',
      input.rawText
    ].join('\n')
  });
  return normalizeSuggestion(value);
}

export async function extractIntakeFromText(env: AnthropicEnv, input: { rawText: string; sourceType: string; requestedBy: string }): Promise<IntakeExtractionPayload> {
  const value = await callClaudeJson(env, {
    model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    maxTokens: 900,
    system: relationshipSystem(),
    content: [
      'Extract a partial West Peek Network intake item from this raw capture.',
      'Partial is okay. Do not invent missing facts. If only name and email are known, use only name and email.',
      'Return JSON with exactly these keys:',
      'name, email, phone, company, title, website, context, suggested_owner, suggested_priority, suggested_touch_method, missing_fields, confidence, raw_extracted_text, human_review_required, execution_allowed.',
      'Rules: suggested_owner must be Sequoia, Scooter, or Unassigned. suggested_priority must be Low, Normal, or High. confidence must be low, medium, or high. human_review_required true. execution_allowed false.',
      `Source type: ${input.sourceType}`,
      `Requested by: ${input.requestedBy}`,
      'Raw capture:',
      input.rawText
    ].join('\n')
  });
  return normalizeExtraction(value, input.rawText);
}

export async function extractIntakeFromImage(env: AnthropicEnv, input: { base64: string; mediaType: string; sourceType: string; contextNote: string; requestedBy: string }): Promise<IntakeExtractionPayload> {
  const value = await callClaudeJson(env, {
    model: env.ANTHROPIC_VISION_MODEL || DEFAULT_VISION_MODEL,
    maxTokens: 1000,
    system: relationshipSystem(),
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: input.mediaType, data: input.base64 }
      },
      {
        type: 'text',
        text: [
          'Read this business card, badge, handwritten note, or notes-app screenshot and create a West Peek intake draft.',
          'Extract visible text and probable contact fields. Do not invent hidden fields.',
          'Return JSON with exactly these keys:',
          'name, email, phone, company, title, website, context, suggested_owner, suggested_priority, suggested_touch_method, missing_fields, confidence, raw_extracted_text, human_review_required, execution_allowed.',
          'Rules: suggested_owner must be Sequoia, Scooter, or Unassigned. suggested_priority must be Low, Normal, or High. confidence must be low, medium, or high. human_review_required true. execution_allowed false.',
          `Source type: ${input.sourceType}`,
          `Requested by: ${input.requestedBy}`,
          `Operator context note: ${input.contextNote || 'none'}`
        ].join('\n')
      }
    ]
  });
  return normalizeExtraction(value, input.contextNote);
}

export async function createThankYouDraft(env: AnthropicEnv, input: { recipientName: string; company: string; reason: string; fromName: string; tone: string }): Promise<ThankYouDraftPayload> {
  const value = await callClaudeJson(env, {
    model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    maxTokens: 700,
    system: relationshipSystem(),
    content: [
      'Create a polished West Peek thank-you card message and email-ready note.',
      'Do not claim anything was sent. Keep it warm, concise, and relationship-centered.',
      'Return JSON with exactly these keys:',
      'card_title, card_message, email_subject, email_body, tone, confidence, human_review_required, execution_allowed.',
      `Recipient: ${input.recipientName}`,
      `Company: ${input.company || 'unknown'}`,
      `Reason: ${input.reason}`,
      `From: ${input.fromName || 'West Peek'}`,
      `Tone: ${input.tone || 'warm polished'}`
    ].join('\n')
  });
  return normalizeThankYou(value, input);
}

async function callClaudeJson(env: AnthropicEnv, input: { model: string; maxTokens: number; system: string; content: string | Array<Record<string, unknown>> }): Promise<Record<string, unknown>> {
  assertAnthropicConfigured(env);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY || '',
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      temperature: 0.2,
      system: input.system,
      messages: [{ role: 'user', content: input.content }]
    })
  });

  const bodyText = await response.text();
  if (!response.ok) throw new Error(`Anthropic request failed: ${response.status} ${bodyText}`);
  const payload = JSON.parse(bodyText) as { content?: Array<{ type?: string; text?: string }> };
  const text = payload.content?.find((item) => item.type === 'text' && item.text)?.text || '';
  if (!text) throw new Error('Anthropic response did not include text content.');
  return parseJsonObject(text);
}

function relationshipSystem() {
  return [
    'You are the West Peek Relationship Assistant.',
    'You prepare relationship intelligence for human review only.',
    'Never claim an action was executed. Never send, approve, merge, delete, order, or commit anything.',
    'Return strict JSON only.'
  ].join(' ');
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Anthropic response did not contain a JSON object.');
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function normalizeSuggestion(value: Record<string, unknown>): RelationshipSuggestionPayload {
  return {
    summary: stringValue(value.summary, 'Relationship context captured for review.'),
    suggested_follow_up: stringValue(value.suggested_follow_up, 'Review and decide the next relationship touch.'),
    suggested_touch_method: stringValue(value.suggested_touch_method, 'undecided'),
    suggested_priority: normalizePriority(value.suggested_priority),
    suggested_tags: arrayValue(value.suggested_tags),
    confidence: normalizeConfidence(value.confidence),
    reasoning_summary: stringValue(value.reasoning_summary, 'AI suggestion requires human review before any action.'),
    human_review_required: true,
    execution_allowed: false
  };
}

function normalizeExtraction(value: Record<string, unknown>, fallbackContext: string): IntakeExtractionPayload {
  return {
    name: stringValue(value.name, ''),
    email: stringValue(value.email, ''),
    phone: stringValue(value.phone, ''),
    company: stringValue(value.company, ''),
    title: stringValue(value.title, ''),
    website: stringValue(value.website, ''),
    context: stringValue(value.context, fallbackContext || 'Captured for West Peek Network review.'),
    suggested_owner: normalizeOwner(value.suggested_owner),
    suggested_priority: normalizePriority(value.suggested_priority),
    suggested_touch_method: stringValue(value.suggested_touch_method, 'undecided'),
    missing_fields: arrayValue(value.missing_fields),
    confidence: normalizeConfidence(value.confidence),
    raw_extracted_text: stringValue(value.raw_extracted_text, fallbackContext || ''),
    human_review_required: true,
    execution_allowed: false
  };
}

function normalizeThankYou(value: Record<string, unknown>, input: { recipientName: string; reason: string; fromName: string; tone: string }): ThankYouDraftPayload {
  const recipient = input.recipientName || 'there';
  return {
    card_title: stringValue(value.card_title, `Thank you, ${recipient}.`),
    card_message: stringValue(value.card_message, `Thank you for the time, insight, and support you shared with West Peek. Relationships like this matter to us. — ${input.fromName || 'West Peek'}`),
    email_subject: stringValue(value.email_subject, `Thank you from West Peek`),
    email_body: stringValue(value.email_body, `Thank you for the time, insight, and support you shared with West Peek.\n\n— ${input.fromName || 'West Peek'}`),
    tone: stringValue(value.tone, input.tone || 'warm polished'),
    confidence: normalizeConfidence(value.confidence),
    human_review_required: true,
    execution_allowed: false
  };
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function arrayValue(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
}

function normalizeOwner(value: unknown): 'Sequoia' | 'Scooter' | 'Unassigned' {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'sequoia') return 'Sequoia';
  if (normalized === 'scooter') return 'Scooter';
  return 'Unassigned';
}

function normalizePriority(value: unknown): 'Low' | 'Normal' | 'High' {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'low') return 'Low';
  if (normalized === 'high') return 'High';
  return 'Normal';
}

function normalizeConfidence(value: unknown): 'low' | 'medium' | 'high' {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'low' || normalized === 'high') return normalized;
  return 'medium';
}
