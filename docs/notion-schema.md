# Notion Schema

The existing Notion data sources are used as the content model.

## Studio Projects

Only these properties belong in the project editing table:

- Title
- Slug
- Status
- Year
- Category
- Featured
- Order
- Cover
- Intro
- Role
- Tools

Project detail body stays in the Notion page body and is converted to a structured block JSON during sync.

## Studio Tools

Fields:

- Name
- Category
- Icon
- Website
- Active
- Order

Used for About skills and project tool labels.

## Studio Social Links

Fields:

- Platform
- Display Label
- URL
- Handle
- Group
- Active
- Order

Used in About, Contact and Footer.

## Studio Site Settings

Fields:

- Name
- Group
- Type
- Value
- Public
- Description
- Order

Sensitive values must be stored as environment variable names with `Type = EnvRef`, not as cleartext.

## Studio Contact Messages

Fields:

- Name
- Email
- Message
- Project Type
- Status
- Created At

Writes are deferred until the protected server-side phase.
