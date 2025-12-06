-- Table for user accounts, including standard authentication fields
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Stores hashed password for traditional authentication
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone_number VARCHAR(50) UNIQUE, -- Optional: for multi-factor authentication or contact
    is_active BOOLEAN DEFAULT TRUE, -- Indicates if the user account is active
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing Biometric Seals, embodying the "Biometric Seal" from Covenant 6.
-- Each record represents a unique biometric enrollment for a user, designed for secure storage
-- of biometric authentication data.
CREATE TABLE IF NOT EXISTS biometric_seals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    biometric_type VARCHAR(50) NOT NULL, -- e.g., 'FINGERPRINT', 'FACIAL_RECOGNITION', 'IRIS_SCAN', 'VOICE_PRINT'
    
    -- biometric_template: Stores the processed, non-reversible biometric data template.
    -- This data should be encrypted at rest and never contain raw biometric scans.
    -- BYTEA is used for efficient storage of binary data in PostgreSQL.
    biometric_template BYTEA NOT NULL,
    
    -- enrollment_identifier: A unique identifier for this specific biometric enrollment.
    -- This could be a system-generated ID or a hash derived from the template,
    -- ensuring uniqueness across all biometric seals for robust lookup and management.
    enrollment_identifier VARCHAR(255) UNIQUE NOT NULL,
    
    is_active BOOLEAN DEFAULT TRUE, -- Flag to enable/disable a specific biometric seal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint linking to the users table.
    -- If a user is deleted, all their associated biometric seals are also deleted.
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for optimized query performance on frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_biometric_seals_user_id ON biometric_seals(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_seals_enrollment_identifier ON biometric_seals(enrollment_identifier);

-- Function to automatically update the 'updated_at' timestamp on row modification
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to apply the update_timestamp function to both the users and biometric_seals tables
CREATE OR REPLACE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE TRIGGER set_biometric_seals_updated_at
BEFORE UPDATE ON biometric_seals
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();