Admin account setup
-------------------

1) Recommended (development):

- Start the backend server (ensure NODE_ENV=development).
- Call the dev setup endpoint to create or update the admin account:

  POST http://localhost:3001/admin/auth/setup-dev
  Content-Type: application/json

  Body:
  {
    "email": "destinyndidi000@gmail.com",
    "password": "123456",
    "username": "admin"
  }

This will upsert the admin row into the `admin` table using the Supabase service role key.

2) SQL (alternate):

Edit the database schema file at [backend/scripts/schema.sql](backend/scripts/schema.sql) and add an INSERT to the `admin` table. Example (NOT hashed):

  -- Replace password_hash with a bcrypt hash for production
  INSERT INTO admin (username, email, password_hash)
  VALUES ('admin', 'destinyndidi000@gmail.com', '<bcrypt_password_hash>')

For local testing you can insert the plain password but it is strongly discouraged. Prefer using the dev endpoint above which will hash the password correctly.

Where to edit schema: see the `-- ADMIN TABLE` section in [backend/scripts/schema.sql](backend/scripts/schema.sql).
