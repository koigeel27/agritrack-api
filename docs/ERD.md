# AgriTrack: Harvest Logbook · ERD (draft for backend pair approval)

```mermaid
erDiagram
    users ||--o{ crops : "owns"
    crops ||--o{ harvests : "has"
    users {
        int id PK
        string full_name
        string email UK
        string password_hash
        enum role "farmer | admin"
        timestamp created_at
    }
    crops {
        int id PK
        int user_id FK
        string name
        enum category "Vegetable | Fruit | Grain | Root crop"
        date planted_on
        string field_location "optional"
        timestamp created_at
    }
    harvests {
        int id PK
        int crop_id FK
        date harvest_date
        decimal quantity_kg "greater than 0"
        string notes "optional"
        timestamp created_at
    }
```

## Rules
- A farmer sees and creates only their own crops and harvests. Admin sees everything, read-only.
- `crops.planted_on` and `harvests.harvest_date` cannot be in the future; a harvest cannot be dated before its crop's `planted_on`.
- `quantity_kg` must be greater than 0. `crops.name` has at least 2 characters.
- 3NF: a harvest's owner is found through its crop, so there is no `user_id` on `harvests`. `crop_name` and `owner_name` in API responses are joined, not stored.

## Open questions for the backend pair
1. Deleting a crop: cascade to its harvests, or block the delete?
2. How are farmer accounts created (seeded, or added by admin)? The frontend has no sign-up screen.
3. Keep `category` as a fixed list, or make it its own table?
