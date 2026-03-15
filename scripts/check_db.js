
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kegbvaikqelwezpehlhf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZ2J2YWlrcWVsd2V6cGVobGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NDc4MzUsImV4cCI6MjA4NzIyMzgzNX0.hIRjDR4D6p8RAsnWMhkF1stRDr_oa0yMsqukCPADyh0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  console.log('--- Checking Unidades ---');
  const { data, error } = await supabase
    .from('unidades')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching unidades:', error.message);
    if (error.message.includes('column "slug" does not exist')) {
        console.log('VERIFIED: Column "slug" DOES NOT EXIST.');
    }
  } else {
    console.log('Unidades data (first 5):');
    data.forEach(u => {
      console.log(`- ID: ${u.id}, Nome: ${u.nome_loja}, Slug: ${u.slug || 'NULL'}`);
    });
  }
}

checkDb();
