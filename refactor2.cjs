const fs = require('fs');

// --- 1. Modify TvPlaylistManager.tsx ---
let manager = fs.readFileSync('src/components/TvPlaylistManager.tsx', 'utf-8');

if (!manager.includes('ScreenShareTransmitter')) {
    manager = manager.replace(
        "import { MediaGalleryModal } from './MediaGalleryModal';",
        "import { MediaGalleryModal } from './MediaGalleryModal';\nimport { ScreenShareTransmitter } from './tv/ScreenShareTransmitter';"
    );
}

// Add transmissao to tipo type
manager = manager.replace(
    /tipo: 'imagem' \| 'video' \| 'youtube' \| 'clima' \| 'top_rank' \| 'mapa'/g,
    "tipo: 'imagem' | 'video' | 'youtube' | 'clima' | 'top_rank' | 'mapa' | 'transmissao'"
);

// Add Transmissao to Select
if (!manager.includes('value="transmissao"')) {
    manager = manager.replace(
        '<SelectItem value="mapa">Mapa Radar de Entregadores</SelectItem>',
        '<SelectItem value="mapa">Mapa Radar de Entregadores</SelectItem>\n                            <SelectItem value="transmissao">Transmissão Ao Vivo (WebRTC)</SelectItem>'
    );
}

// Disable URL input for transmissao
manager = manager.replace(
    /novoItem\.tipo === 'clima' \|\| novoItem\.tipo === 'top_rank' \|\| novoItem\.tipo === 'mapa'/g,
    "novoItem.tipo === 'clima' || novoItem.tipo === 'top_rank' || novoItem.tipo === 'mapa' || novoItem.tipo === 'transmissao'"
);

// Add Icon for transmissao
if (!manager.includes('transmissao: MonitorUp')) {
    if (!manager.includes('MonitorUp')) {
        manager = manager.replace(
            "import { Tv, Cloud, Youtube, Image, Video, Plus, Trash2, GripVertical, Trophy, MapPin } from 'lucide-react';",
            "import { Tv, Cloud, Youtube, Image, Video, Plus, Trash2, GripVertical, Trophy, MapPin, MonitorUp } from 'lucide-react';"
        );
    }
    manager = manager.replace(
        "mapa: MapPin,",
        "mapa: MapPin,\n        transmissao: MonitorUp,"
    );
}

// Embed the transmitter component at the bottom of the config page
if (!manager.includes('<ScreenShareTransmitter />')) {
    manager = manager.replace(
        '            </div>\n\n        </div>',
        '            </div>\n\n            {/* Bloco 4: Transmissor */}\n            <ScreenShareTransmitter />\n\n        </div>'
    );
}

fs.writeFileSync('src/components/TvPlaylistManager.tsx', manager, 'utf-8');

// --- 2. Modify App.tsx ---
let app = fs.readFileSync('src/App.tsx', 'utf-8');
if (app.includes('import Broadcast from')) {
    app = app.replace("import Broadcast from './pages/Broadcast';\n", "");
    app = app.replace('<Route path="/broadcast" element={<Broadcast />} />\n', "");
}
fs.writeFileSync('src/App.tsx', app, 'utf-8');

// --- 3. Modify TV.tsx ---
let tv = fs.readFileSync('src/pages/TV.tsx', 'utf-8');

if (tv.includes('ScreenShare States')) {
    tv = tv.replace("  // Screen Share States\n  const [screenShareActive, setScreenShareActive] = useState(false);\n  const [broadcastAvailable, setBroadcastAvailable] = useState(false);\n", "  const [broadcastAvailable, setBroadcastAvailable] = useState(false);\n");
}

tv = tv.replace(/screenShareActive/g, "true"); // Wait, no! We can't just replace true!

// Let's be more precise
tv = fs.readFileSync('src/pages/TV.tsx', 'utf-8');
const tvLines = tv.split(/\\r?\\n/);
let newTvLines = [];
for(let i=0; i<tvLines.length; i++) {
    const line = tvLines[i];
    
    // Remove states
    if (line.includes("const [screenShareActive, setScreenShareActive] = useState(false);")) continue;
    if (line.includes("// Screen Share States")) continue;
    
    // Replace renderMedia
    if (line.includes("let media;")) {
        // Skip the next 6 lines
        i += 6;
        continue;
    }
    
    // Replace sidebar logic
    if (line.includes("if (unidadeData?.exibir_fila_tv && (screenShareActive || slide.tipo !== 'top_rank')) {")) {
        newTvLines.push("    if (unidadeData?.exibir_fila_tv && slide.tipo !== 'top_rank') {");
        continue;
    }
    
    // Remove MonitorPlay from imports
    if (line.includes("import { User, Volume2, VolumeX, RotateCcw, Package, UserPlus, Trophy, MonitorPlay } from 'lucide-react';")) {
        newTvLines.push("import { User, Volume2, VolumeX, RotateCcw, Package, UserPlus, Trophy } from 'lucide-react';");
        continue;
    }
    
    // Remove MonitorPlay button
    if (line.includes("<Button ") && tvLines[i+1] && tvLines[i+1].includes("onClick={() => setScreenShareActive(!screenShareActive)}")) {
        i += 7; // Skip the button lines
        continue;
    }
    
    newTvLines.push(line);
}

// Now we need to add transmissao to renderMedia switch case
let finalTvStr = newTvLines.join('\\n');
if (!finalTvStr.includes("case 'transmissao':")) {
    finalTvStr = finalTvStr.replace(
        "default: return null;",
        "case 'transmissao': return <ScreenShareReceiver isActive={isActive} onStreamAvailable={setBroadcastAvailable} />;\n        default: return null;"
    );
}

// Since we removed the let media block, we need to add const media = renderMedia() back
if (!finalTvStr.includes("const media = renderMedia();")) {
    finalTvStr = finalTvStr.replace(
        "    // Se exibir_fila_tv estiver ativo",
        "    const media = renderMedia();\n\n    // Se exibir_fila_tv estiver ativo"
    );
}

fs.writeFileSync('src/pages/TV.tsx', finalTvStr, 'utf-8');
