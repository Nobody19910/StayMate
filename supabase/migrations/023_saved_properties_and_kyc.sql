-- 023: Saved Properties and expanded KYC

-- 1. Saved Properties
CREATE TABLE IF NOT EXISTS public.saved_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    property_id TEXT NOT NULL, -- can be home- ID or hostel- ID or room- ID
    property_type TEXT NOT NULL CHECK (property_type IN ('home', 'hostel', 'room')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, property_id)
);

ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own saved properties" ON public.saved_properties;
CREATE POLICY "Users can manage their own saved properties"
    ON public.saved_properties FOR ALL
    USING (auth.uid() = user_id);

-- 2. Expand KYC with image upload
ALTER TABLE public.kyc_submissions
ADD COLUMN IF NOT EXISTS id_card_image_url TEXT;

