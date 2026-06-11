const fs = require('fs');

let content = fs.readFileSync('src/pages/TV.tsx', 'utf-8');

// 1. Imports
content = content.replace("import { User, Volume2, VolumeX, RotateCcw, Package, UserPlus, Trophy, MonitorPlay } from 'lucide-react';", "import { User, Volume2, VolumeX, RotateCcw, Package, UserPlus, Trophy } from 'lucide-react';");

// 2. States
const state_block = `  // Screen Share States
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [broadcastAvailable, setBroadcastAvailable] = useState(false);`;
const new_state_block = `  // Screen Share States
  const [broadcastAvailable, setBroadcastAvailable] = useState(false);`;
content = content.replace(state_block, new_state_block);

// 3. Transmissao Slide Type
const map_case_end = `          );
        }
        default: return null;`;
const new_map_case_end = `          );
        }
        case 'transmissao': return <ScreenShareReceiver isActive={isActive} onStreamAvailable={setBroadcastAvailable} />;
        default: return null;`;
content = content.replace(map_case_end, new_map_case_end);

// 4. Remove Let Media logic
content = content.replace(/    let media;\n    if \(screenShareActive\) \{\n      media = <ScreenShareReceiver isActive=\{isActive\} onStreamAvailable=\{setBroadcastAvailable\} \/>;\n    \} else \{\n      media = renderMedia\(\);\n    \}\n\n    \/\/ Se exibir_fila_tv estiver ativo e n[^\s]+ for o slide nativo de rank, mescla a fila lateral\n    if \(unidadeData\?\.exibir_fila_tv && \(screenShareActive \|\| slide\.tipo !== 'top_rank'\)\) \{/g, 
`    const media = renderMedia();\n\n    // Se exibir_fila_tv estiver ativo e não for o slide nativo de rank, mescla a fila lateral\n    if (unidadeData?.exibir_fila_tv && slide.tipo !== 'top_rank') {`);

// 5. Header Button
const button_block = `        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setScreenShareActive(!screenShareActive)} 
            variant={screenShareActive ? "default" : "outline"}
            className={\`gap-2 \${screenShareActive ? 'bg-emerald-600 hover:bg-emerald-700' : ''}\`}
            title="Ativar/Desativar Recebimento de Transmissão"
          >
            <MonitorPlay className={\`w-5 h-5 \${broadcastAvailable && !screenShareActive ? 'animate-pulse text-emerald-500' : ''}\`} /> 
            Transmissão {screenShareActive ? 'Ativa' : ''}
          </Button>
          <Button onClick={() => setCheckinOpen(true)} variant="outline" className="gap-2"><UserPlus className="w-5 h-5" /> Check-in</Button>`;
const new_button_block = `        <div className="flex items-center gap-4">
          <Button onClick={() => setCheckinOpen(true)} variant="outline" className="gap-2"><UserPlus className="w-5 h-5" /> Check-in</Button>`;
content = content.replace(button_block, new_button_block);

fs.writeFileSync('src/pages/TV.tsx', content, 'utf-8');
