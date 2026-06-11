const fs = require('fs');
let content = fs.readFileSync('src/components/TvPlaylistManager.tsx', 'utf-8');

// Imports
content = content.replace(
  "import { MediaGalleryModal } from './MediaGalleryModal';",
  "import { MediaGalleryModal } from './MediaGalleryModal';\nimport { ScreenShareTransmitter } from './tv/ScreenShareTransmitter';"
);
content = content.replace(
  "import { Tv, Cloud, Youtube, Image, Video, Plus, Trash2, GripVertical, Trophy, MapPin } from 'lucide-react';",
  "import { Tv, Cloud, Youtube, Image, Video, Plus, Trash2, GripVertical, Trophy, MapPin, MonitorUp } from 'lucide-react';"
);

// Tipo Enum
content = content.replace(
  "tipo: 'imagem' | 'video' | 'youtube' | 'clima' | 'top_rank' | 'mapa';",
  "tipo: 'imagem' | 'video' | 'youtube' | 'clima' | 'top_rank' | 'mapa' | 'transmissao';"
);
content = content.replace(
  "tipo: 'imagem' | 'video' | 'youtube' | 'clima' | 'top_rank' | 'mapa';",
  "tipo: 'imagem' | 'video' | 'youtube' | 'clima' | 'top_rank' | 'mapa' | 'transmissao';"
);

// SelectItem
content = content.replace(
  '<SelectItem value="mapa">Mapa Radar de Entregadores</SelectItem>',
  '<SelectItem value="mapa">Mapa Radar de Entregadores</SelectItem>\n                            <SelectItem value="transmissao">Transmissão Ao Vivo (WebRTC)</SelectItem>'
);

// URL Disable Check (two places)
content = content.replace(
  /novoItem\.tipo === 'clima' \|\| novoItem\.tipo === 'top_rank' \|\| novoItem\.tipo === 'mapa'/g,
  "novoItem.tipo === 'clima' || novoItem.tipo === 'top_rank' || novoItem.tipo === 'mapa' || novoItem.tipo === 'transmissao'"
);

// IconMap
content = content.replace(
  "mapa: MapPin,",
  "mapa: MapPin,\n        transmissao: MonitorUp,"
);

// Button disabled check
content = content.replace(
  "disabled={addItemMutation.isPending || ((novoItem.tipo !== 'clima' && novoItem.tipo !== 'top_rank' && novoItem.tipo !== 'mapa') && !novoItem.url)}",
  "disabled={addItemMutation.isPending || ((novoItem.tipo !== 'clima' && novoItem.tipo !== 'top_rank' && novoItem.tipo !== 'mapa' && novoItem.tipo !== 'transmissao') && !novoItem.url)}"
);

let lines = content.split(/\\r?\\n/);
let lastDivIndex = -1;

for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('</div>')) {
    lastDivIndex = i;
    break;
  }
}

if (lastDivIndex !== -1) {
  lines.splice(lastDivIndex + 1, 0, '            {/* Bloco 4: Transmissor */}', '            <ScreenShareTransmitter />');
}

content = lines.join('\\n');

fs.writeFileSync('src/components/TvPlaylistManager.tsx', content, 'utf-8');
