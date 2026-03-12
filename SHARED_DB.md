# Shared Database: Work.WitUS + CentenarianOS

Both **Work.WitUS** (contractor-os) and **CentenarianOS** (centenarian-os) share the same Supabase database and `profiles` table. Migrations in either repo must not break the other app.

## Rules

1. **Always use `IF NOT EXISTS` / `IF EXISTS`** for additive or removal migrations.
2. **Never drop columns** that the other app relies on — check both repos first.
3. **Copy new migrations to both repos** so schema history stays in sync.
4. **Run the migration once** from whichever repo you're working in.

## Columns added by Work.WitUS (not used by CentenarianOS)

| Table | Column | Type | Default | Migration | Notes |
|-------|--------|------|---------|-----------|-------|
| `profiles` | `clock_format` | `text` | `'12h'` | `120_add_clock_format.sql` | 12h/24h clock preference. CentOS can safely ignore. |

## Columns added by CentenarianOS (not used by Work.WitUS)

_None currently tracked. Add entries here when CentOS adds columns that Work.WitUS doesn't use._

## Tables added by CentenarianOS (used by both)

| Table | Migration | Notes |
|-------|-----------|-------|
| `equipment_media` | `119_equipment_media.sql` | Multi-media gallery for equipment items. Used by both apps. |

## Shared columns (used by both)

- `profiles.dashboard_home` — user's preferred home page (different defaults per app)
- `profiles.scan_auto_save_images` — scan preference
- `profiles.likes_public` — social privacy setting
- `profiles.show_done_counts` — activity count visibility
