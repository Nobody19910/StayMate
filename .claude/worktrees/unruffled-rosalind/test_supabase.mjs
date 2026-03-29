import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signInAndTest() {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'testxyz123@example.com', 
    password: 'password123'
  });
  
  if (signInError) {
      console.error("Auth Error, skipping data inserts. Try manually on the website:", signInError);
      return;
  }

  const userId = signInData.user.id;
  console.log("Logged in successfully as:", userId);

  // test upload
  const file = new Blob(['hello world, real test'], { type: 'text/plain' });
  const { data: storageData, error: storageError } = await supabase.storage.from('listing-images').upload(`test/test-${Date.now()}.txt`, file);
  
  if (storageError) {
      console.error("Storage Error:", storageError);
  } else {
      console.log("Storage OK - Permissions verified!");
  }

  // test homes
  const { data: homeData, error: homeError } = await supabase.from('homes').insert({
    id: `home-${Date.now()}`,
    property_type: 'apartment',
    title: 'Test Final',
    description: 'Test Final',
    price: 1,
    price_label: '1',
    for_sale: false,
    beds: 1,
    baths: 1,
    sqft: 1,
    address: '1',
    city: '1',
    state: '1',
    images: [],
    owner_id: userId
  });

  if (homeError) {
      console.error("Database Error:", homeError);
  } else {
      console.log("Database OK - Listings can now be published!");
  }

}

signInAndTest();
