import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing Supabase connection with auth...");
  
  // 1. Sign up a fake user
  const email = `test-${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  
  if (authError) {
    console.error("Auth Error:", authError.message);
    return;
  }
  
  const user = authData.user;
  console.log("User signed up:", user.id);

  // 2. Test storage bucket
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('listing-images')
    .upload(`test/${Date.now()}.txt`, 'hello world', { upsert: true });
    
  if (uploadError) {
    console.error("Storage Error:", uploadError.message);
  } else {
    console.log("Storage OK");
  }

  // 3. Test homes insert
  const { data: homeData, error: homeError } = await supabase.from('homes').insert({
      id: `home-${Date.now()}`,
      property_type: 'apartment',
      title: 'Test',
      description: 'Test',
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
      owner_id: user.id
  });
  
  if (homeError) {
    console.error("Homes Insert Error:", homeError.message);
  } else {
    console.log("Homes Insert OK");
  }
  
  // 4. Test hostels insert
  const hostelId = `hostel-${Date.now()}`;
  const { error: hostelError } = await supabase.from('hostels').insert({
      id: hostelId,
      name: 'test',
      description: 'test',
      address: 'test',
      city: 'test',
      state: 'test',
      nearby_universities: [],
      images: [],
      total_rooms: 1,
      available_rooms: 1,
      price_range_min: 1,
      price_range_max: 1,
      price_range_label: '1',
      manager_id: user.id
  });
  
  if (hostelError) {
    console.error("Hostels Insert Error:", hostelError.message);
  } else {
    console.log("Hostels Insert OK");
  }

  // 5. Test rooms insert
  const { error: roomError } = await supabase.from('rooms').insert({
      id: `room-${Date.now()}`,
      hostel_id: hostelId,
      name: 'test',
      room_type: 'single',
      price: 1,
      price_label: '1',
      capacity: 1,
      available: true,
      amenities: [],
      images: [],
      description: 'test'
  });
  
  if (roomError) {
    console.error("Rooms Insert Error:", roomError.message);
  } else {
    console.log("Rooms Insert OK");
  }
}

test();
