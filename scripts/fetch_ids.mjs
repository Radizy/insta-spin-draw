import fs from 'fs';

async function run() {
    const env = fs.readFileSync('.env', 'utf-8');
    const urlMatch = env.match(/VITE_SUPABASE_URL=\"(.*?)\"/);
    const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=\"(.*?)\"/);
    const url = urlMatch[1];
    const key = keyMatch[1];

    const headers = { 'apikey': key, 'Authorization': 'Bearer ' + key };

    const fRes = await fetch(url + '/rest/v1/franquias?select=id,nome_franquia&nome_franquia=ilike.*fiorentino*', { headers });
    const franquias = await fRes.json();
    console.log('Franquias:', JSON.stringify(franquias));

    if (franquias.length > 0) {
        const uRes = await fetch(url + '/rest/v1/unidades?select=id,nome_loja,franquia_id&franquia_id=eq.' + franquias[0].id + '&nome_loja=ilike.*itaqua*', { headers });
        const unidades = await uRes.json();
        console.log('Unidades:', JSON.stringify(unidades));
    }
}
run();
