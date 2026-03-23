-- Encrypt payment references using pgcrypto
-- Stores a SHA-256 hash instead of plaintext Paystack reference

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add hashed column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference_hash text;

-- Trigger: auto-hash payment_reference on INSERT or UPDATE
CREATE OR REPLACE FUNCTION hash_payment_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_reference IS NOT NULL AND NEW.payment_reference <> '' THEN
    NEW.payment_reference_hash := encode(digest(NEW.payment_reference, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hash_payment_ref
  BEFORE INSERT OR UPDATE OF payment_reference ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION hash_payment_reference();

-- Hash any existing plaintext references
UPDATE bookings
SET payment_reference_hash = encode(extensions.digest(payment_reference, 'sha256'), 'hex')
WHERE payment_reference IS NOT NULL AND payment_reference <> '';
