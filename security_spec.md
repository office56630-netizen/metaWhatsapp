# Firebase Firestore Security Specification & Attack Matrix

## 1. System Architecture & Data Invariants
This application utilizes Google Cloud Firebase Firestore Enterprise Edition (Free Tier) to store and replicate multi-tenant WhatsApp Cloud API broadcast delivery records, client configurations, chat conversations, contacts, and meta templates.

### Data Invariants:
1. **Tenant Isolation**: All sub-resources (`whatsapp_accounts`, `campaigns`, `campaign_messages`, `contacts`, `templates`, `chat_messages`, `credit_transactions`) must be bound to a valid, non-empty `client_id`.
2. **Delivery Record Immutability**: Critical identifier attributes (`id`, `campaign_id`, `client_id`, `created_at`) on `campaign_messages` cannot be mutated or forged once written.
3. **Identifier Sanitization**: All document IDs and reference path variables must satisfy `^[a-zA-Z0-9_\-]+$` and be under 128 characters to prevent Path Traversal and Resource Exhaustion attacks.
4. **Auditability**: Status transitions (Queued -> Sent -> Delivered -> Read) enforce monotonic progression with ISO-8601 timestamps.
5. **Zero-Trust Default**: All arbitrary document paths outside defined collections are rejected via a global default-deny rule.

---

## 2. The "Dirty Dozen" Malicious Payloads (Negative Tests)

The following 12 test payloads are explicitly formulated to violate security boundaries and must return `PERMISSION_DENIED`:

### Attack 1: Unauthenticated Read
```json
{
  "target": "/campaign_messages/MSG-001",
  "operation": "get",
  "auth": null,
  "expected": "PERMISSION_DENIED"
}
```

### Attack 2: Path Traversal in Document ID
```json
{
  "target": "/clients/../other_tenant_id",
  "operation": "get",
  "auth": { "uid": "attacker_123" },
  "expected": "PERMISSION_DENIED"
}
```

### Attack 3: Resource Poisoning (Giant ID Payload)
```json
{
  "target": "/campaign_messages/MSG_OVERSIZED_STRING_LONGER_THAN_128_CHARS_EXCEEDING_MAX_SPEC_LIMIT_ATTACK_ATTACK_ATTACK_ATTACK_ATTACK_ATTACK_ATTACK_ATTACK_ATTACK_ATTACK",
  "operation": "set",
  "auth": { "uid": "attacker_123" },
  "expected": "PERMISSION_DENIED"
}
```

### Attack 4: Anonymous Blanket Collection Wipe
```json
{
  "target": "/campaigns",
  "operation": "delete",
  "auth": null,
  "expected": "PERMISSION_DENIED"
}
```

### Attack 5: Shadow Field Injection in WhatsApp Config
```json
{
  "target": "/whatsapp_accounts/WA-001",
  "operation": "update",
  "auth": { "uid": "attacker_123" },
  "data": {
    "isSuperAdminOverride": true,
    "systemRole": "root"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Attack 6: Cross-Tenant Client Hijack
```json
{
  "target": "/clients/CLT-00001",
  "operation": "update",
  "auth": { "uid": "rogue_user_from_tenant_2" },
  "data": { "api_token": "hijacked_token" },
  "expected": "PERMISSION_DENIED"
}
```

### Attack 7: Template Document ID Junk Characters Injection
```json
{
  "target": "/templates/<script>alert(1)</script>",
  "operation": "get",
  "auth": { "uid": "attacker_123" },
  "expected": "PERMISSION_DENIED"
}
```

### Attack 8: Unbounded Payload Flood in Campaign Record
```json
{
  "target": "/campaign_messages/MSG-123",
  "operation": "set",
  "auth": { "uid": "attacker_123" },
  "data": {
    "id": "MSG-123",
    "client_id": "CLT-00001",
    "phone": "invalid_phone_with_20000_junk_chars",
    "rendered_body": "repeat(20MB)"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Attack 9: Credit Transaction Falsification
```json
{
  "target": "/credit_transactions/TXN-ROGUE",
  "operation": "set",
  "auth": null,
  "data": {
    "amount": 9999999,
    "balance_after": 9999999
  },
  "expected": "PERMISSION_DENIED"
}
```

### Attack 10: Chat Spoofing as Meta Server
```json
{
  "target": "/chat_messages/CHAT-SPOOF",
  "operation": "set",
  "auth": null,
  "data": {
    "sender": "business",
    "text": "Phishing prompt"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Attack 11: Arbitrary Wildcard Root Document Write
```json
{
  "target": "/arbitrary_collection_admin/backdoor",
  "operation": "set",
  "auth": { "uid": "attacker_123" },
  "data": { "exploit": true },
  "expected": "PERMISSION_DENIED"
}
```

### Attack 12: Contact Phone Format Poisoning
```json
{
  "target": "/contacts/CT-INVALID",
  "operation": "set",
  "auth": null,
  "data": {
    "name": "SQL Injection ' OR 1=1--",
    "phone": "NaN"
  },
  "expected": "PERMISSION_DENIED"
}
```

---

## 3. Security Rules Verification
- `firestore.rules` deploys with `rules_version = '2';`.
- Catch-all `match /{document=**} { allow read, write: if false; }` prevents root traversal.
- Document IDs across all collections are strictly validated with `isValidId(id)` checking length (`<= 128`) and regex regex guard (`^[a-zA-Z0-9_\-]+$`).
- Rules successfully deployed to Firebase backend instance `ai-studio-metawhatsappmult-1ba2bda5-2b9f-406e-b07f-4befbea47c77`.
