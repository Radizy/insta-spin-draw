const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfParser = new PDFParser(this, 1);
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx6AjQ7rXWLrLSJtMrgVJUx4on6ktttCmUbqmMyO7NmQAFTqedKxQk1nzAyhruW3NAmlg/exec';

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", async pdfData => {
    const rawText = pdfParser.getRawTextContent();
    const lines = rawText.split('\n');

    // Regex to match lines like: "19/02/2026 ENTRADA   Toquinho        18:51 TOQUINHO"
    // with \r removing
    const regex = /^(\d{2}\/\d{2}\/\d{4})\s+(ENTRADA|SAIDA)\s+(.*?)\s+(\d{2}:\d{2})(?:\s+(.*))?$/;

    const events = [];

    for (const line of lines) {
        let cleanLine = line.trim().replace(/\r/g, '');
        if (!cleanLine || cleanLine.includes('Page (')) continue;

        const match = cleanLine.match(regex);
        if (match) {
            events.push({
                data_br: match[1],
                tipo: match[2],
                nome: match[3].trim(),
                horario: match[4].trim(),
                maquininha: (match[5] || '').trim() || match[3].trim()
            });
        }
    }

    console.log(`Parsed ${events.length} events from PDF.`);

    const activeSessions = {}; // Maps motoboy name to ID_VINCULO
    let fakeIdCounter = 1;
    const payloads = [];

    for (const ev of events) {
        // Date to ISO Format
        const [day, month, year] = ev.data_br.split('/');
        const isoDate = `${year}-${month}-${day}T${ev.horario}:00`;

        if (ev.tipo === 'ENTRADA') {
            const id_vinculo = `pdf_import_${year}${month}${day}_${fakeIdCounter++}`;
            activeSessions[ev.nome] = id_vinculo;

            payloads.push({
                unidade: 'ITAQUA',
                tipo: 'retirada_maquininha',
                motoboy: ev.nome,
                maquininha: ev.maquininha,
                checkin: isoDate,
                retirada: isoDate,
                id_vinculo: id_vinculo,
                data: ev.data_br
            });
        } else if (ev.tipo === 'SAIDA') {
            let id_vinculo = activeSessions[ev.nome];

            if (!id_vinculo) {
                id_vinculo = `pdf_import_unmatched_${year}${month}${day}_${fakeIdCounter++}`;
                // Let's create a dummy Entrada if it wasn't recorded, so it appears in the sheet
                payloads.push({
                    unidade: 'ITAQUA',
                    tipo: 'retirada_maquininha',
                    motoboy: ev.nome,
                    maquininha: ev.maquininha,
                    checkin: isoDate,
                    retirada: isoDate,
                    id_vinculo: id_vinculo,
                    data: ev.data_br
                });
            }

            payloads.push({
                unidade: 'ITAQUA',
                tipo: 'devolucao_maquininha',
                motoboy: ev.nome,
                maquininha: ev.maquininha,
                devolucao: isoDate,
                id_vinculo: id_vinculo,
                data: ev.data_br
            });

            delete activeSessions[ev.nome];
        }
    }

    console.log(`Prepared ${payloads.length} webhook payloads. Submitting now...`);

    let success = 0;
    for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        try {
            // using native node fetch
            const res = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            await res.text(); // just consume the response
            console.log(`[${i + 1}/${payloads.length}] Sent ${payload.tipo} for ${payload.motoboy}. Code: ${res.status}`);
            success++;

            // Wait 500ms to avoid Google Sheet rate limits on simultaneous edits
            await new Promise(r => setTimeout(r, 600));
        } catch (e) {
            console.error(`Error sending payload [${i + 1}]:`, e);
        }
    }

    console.log(`Done! ${success}/${payloads.length} payloads succeeded.`);
});

pdfParser.loadPDF('../Controle Horário motoboy - Google Planilhas.pdf');
